package config

import (
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/BurntSushi/toml"
)

// MigrationResult is the complete, validated result of migrating the legacy
// markdown config. The command writes these two byte slices only after this
// function has returned successfully, so a parse or merge refusal cannot leave
// one file half-migrated.
type MigrationResult struct {
	ConfigMD    []byte
	RunnersTOML []byte
	Warnings    []string
	Changed     bool
}

type migrationLineError struct {
	line int
	text string
	msg  string
}

func (e migrationLineError) Error() string {
	return fmt.Sprintf(".tick/config.md:%d: %s — %s", e.line, e.msg, strings.TrimSpace(e.text))
}

type migrationConflictError struct {
	line int
	path string
	msg  string
}

func (e migrationConflictError) Error() string {
	if e.line > 0 {
		return fmt.Sprintf(".tick/config.md:%d: %s (%s)", e.line, e.msg, e.path)
	}
	return fmt.Sprintf(".tick/runners.toml: %s (%s)", e.msg, e.path)
}

type legacySection struct {
	name       string
	heading    int
	end        int
	body       []legacyLine
	structured bool
}

type legacyLine struct {
	number int
	text   string
}

type legacyCommand struct {
	id          string
	command     string
	description string
	table       string
	line        int
}

type acceptanceMapping struct {
	itemID  string
	command string
	line    int
}

type piValue struct {
	key   string
	value string
	line  int
}

type legacyConfig struct {
	lines           []string
	lineEnding      string
	trailingNewline bool
	sections        map[string]*legacySection
	commands        []legacyCommand
	acceptance      []acceptanceMapping
	pi              []piValue
	testingKeep     []legacyLine
}

type migrateAssignment struct {
	table       string
	key         string
	value       string
	stringValue *string
	intValue    *int
	command     *legacyCommand
	acceptance  *acceptanceMapping
	line        int
}

type migrateTable struct {
	path        string
	assignments []migrateAssignment
}

var (
	legacyHeadingRE    = regexp.MustCompile(`^\s*#{2,}\s+(.+?)\s*$`)
	legacyCommandRE    = regexp.MustCompile("^(?:([^`\\r\\n]{1,500}?):\\s*)?`([^`\\r\\n]+)`([^`]*)$")
	legacyAcceptanceRE = regexp.MustCompile("^[-*+]\\s+(A[1-9][0-9]{0,2})\\s*:\\s*`([^`\\r\\n]+)`(?:\\s+([^`]*)?)?$")
	legacyKeyValueRE   = regexp.MustCompile(`^[-*+]\s*([a-zA-Z0-9_.-]+)\s*:\s*(.+)$`)
	tomlTableRE        = regexp.MustCompile(`^\s*\[([^\[\]]+)\]\s*(?:#.*)?$`)
)

var migrationStructuredSections = map[string]bool{
	"testing":                    true,
	"closeout evidence commands": true,
	"acceptance evidence":        true,
	"pi orchestrator":            true,
	"environment":                true,
}

var migrationPiKeys = map[string]bool{
	"planner_model":            true,
	"scout_model":              true,
	"implement_economy_model":  true,
	"implement_balanced_model": true,
	"implement_strong_model":   true,
	"review_model":             true,
	"closeout_model":           true,
	"max_parallel":             true,
}

// Migrate converts the structured sections in a legacy .tick/config.md into
// the schema-shaped runners.toml representation. It is deliberately a pure
// function: callers can show the resulting diff without granting the parser
// permission to write files.
func Migrate(configMD, runnersTOML []byte) (MigrationResult, error) {
	legacy, err := parseLegacyConfig(configMD)
	if err != nil {
		return MigrationResult{}, err
	}
	if !legacy.hasStructuredSections() {
		return MigrationResult{ConfigMD: append([]byte(nil), configMD...), RunnersTOML: append([]byte(nil), runnersTOML...)}, nil
	}

	tables, err := buildMigrationTables(legacy)
	if err != nil {
		return MigrationResult{}, err
	}
	mergedRunners, warnings, err := mergeRunnersTOML(runnersTOML, tables)
	if err != nil {
		return MigrationResult{}, err
	}
	if _, err := Parse(mergedRunners); err != nil {
		return MigrationResult{}, fmt.Errorf("migrated .tick/runners.toml does not validate: %w", err)
	}

	newConfig := rewriteLegacyConfig(legacy)
	return MigrationResult{
		ConfigMD:    []byte(newConfig),
		RunnersTOML: mergedRunners,
		Warnings:    warnings,
		Changed:     !bytesEqual(configMD, []byte(newConfig)) || !bytesEqual(runnersTOML, mergedRunners),
	}, nil
}

func (c legacyConfig) hasStructuredSections() bool {
	for name, section := range c.sections {
		if migrationStructuredSections[name] && section != nil {
			if name == "testing" && len(c.commands) == 0 && len(c.acceptance) == 0 && len(c.pi) == 0 {
				continue
			}
			return true
		}
	}
	return false
}

func parseLegacyConfig(data []byte) (legacyConfig, error) {
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	ending := "\n"
	if strings.Contains(string(data), "\r\n") {
		ending = "\r\n"
	} else if strings.Contains(string(data), "\r") {
		ending = "\r"
	}
	trailingNewline := strings.HasSuffix(string(data), "\n") || strings.HasSuffix(string(data), "\r")
	lines := strings.Split(text, "\n")
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	parsed := legacyConfig{
		lines:           lines,
		lineEnding:      ending,
		trailingNewline: trailingNewline,
		sections:        map[string]*legacySection{},
	}
	for i, line := range lines {
		match := legacyHeadingRE.FindStringSubmatch(line)
		if match == nil {
			continue
		}
		name := strings.ToLower(strings.TrimSpace(match[1]))
		if !migrationStructuredSections[name] {
			continue
		}
		if _, exists := parsed.sections[name]; exists {
			return parsed, migrationLineError{line: i + 1, text: line, msg: "duplicate structured section; merge it before migrating"}
		}
		parsed.sections[name] = &legacySection{name: name, heading: i, structured: true}
	}

	// A structured section ends at any level-two-or-deeper heading. This is the
	// same boundary used by the legacy runner, and it prevents a nested or
	// unknown heading from being swallowed as executable config.
	for _, section := range parsed.sections {
		section.end = len(lines)
		for i := section.heading + 1; i < len(lines); i++ {
			if legacyHeadingRE.MatchString(lines[i]) {
				section.end = i
				break
			}
		}
		for i := section.heading + 1; i < section.end; i++ {
			section.body = append(section.body, legacyLine{number: i + 1, text: lines[i]})
		}
	}

	var err error
	if section := parsed.sections["testing"]; section != nil {
		commands, notes, err := parseTestingSection(section.body)
		if err != nil {
			return parsed, err
		}
		parsed.commands = append(parsed.commands, commands...)
		parsed.testingKeep = notes
	}
	if section := parsed.sections["closeout evidence commands"]; section != nil {
		commands, err := parseStrictCommandSection(section.body, "close-out evidence", "closeout evidence")
		if err != nil {
			return parsed, err
		}
		parsed.commands = append(parsed.commands, commands...)
	}
	if section := parsed.sections["environment"]; section != nil {
		commands, err := parseStrictCommandSection(section.body, "environment", "environment")
		if err != nil {
			return parsed, err
		}
		parsed.commands = append(parsed.commands, commands...)
	}
	if section := parsed.sections["acceptance evidence"]; section != nil {
		parsed.acceptance, err = parseAcceptanceSection(section.body)
		if err != nil {
			return parsed, err
		}
	}
	if section := parsed.sections["pi orchestrator"]; section != nil {
		parsed.pi, err = parsePiSection(section.body)
		if err != nil {
			return parsed, err
		}
	}

	if err := validateLegacyCommands(parsed.commands, parsed.acceptance); err != nil {
		return parsed, err
	}
	return parsed, nil
}

func parseTestingSection(lines []legacyLine) ([]legacyCommand, []legacyLine, error) {
	var commands []legacyCommand
	var notes []legacyLine
	var pendingBlank []legacyLine
	for _, line := range lines {
		trimmed := strings.TrimSpace(line.text)
		if trimmed == "" {
			if len(notes) > 0 {
				notes = append(notes, line)
			} else {
				pendingBlank = append(pendingBlank, line)
			}
			continue
		}
		body := stripMarkdownBullet(trimmed)
		if body == "" {
			continue
		}
		command, ok, hasInline := parseLegacyCommand(body, line.number, line.text, "testing")
		if ok {
			if err := validateMigrationCommand(command, line.text); err != nil {
				return nil, nil, err
			}
			commands = append(commands, command)
			continue
		}
		if hasInline {
			return nil, nil, migrationLineError{line: line.number, text: line.text, msg: "testing line contains inline code that is not one isolated command"}
		}
		// A Testing line without inline code is narrative. It stays in
		// config.md, and is also retained as [testing].notes for TOML readers.
		if len(notes) == 0 && len(pendingBlank) > 0 {
			notes = append(notes, pendingBlank...)
			pendingBlank = nil
		}
		notes = append(notes, line)
	}
	return commands, notes, nil
}

func parseStrictCommandSection(lines []legacyLine, sectionName, table string) ([]legacyCommand, error) {
	var commands []legacyCommand
	for _, line := range lines {
		if strings.TrimSpace(line.text) == "" {
			continue
		}
		body := stripMarkdownBullet(strings.TrimSpace(line.text))
		command, ok, _ := parseLegacyCommand(body, line.number, line.text, table)
		if !ok {
			return nil, migrationLineError{line: line.number, text: line.text, msg: fmt.Sprintf("%s line must contain exactly one isolated inline-code command", sectionName)}
		}
		if err := validateMigrationCommand(command, line.text); err != nil {
			return nil, err
		}
		commands = append(commands, command)
	}
	return commands, nil
}

func parseLegacyCommand(body string, line int, source, table string) (legacyCommand, bool, bool) {
	if !strings.Contains(body, "`") {
		return legacyCommand{}, false, false
	}
	match := legacyCommandRE.FindStringSubmatch(body)
	if match == nil || strings.TrimSpace(match[2]) == "" {
		return legacyCommand{}, false, true
	}
	label := strings.TrimSpace(match[1])
	commandText := strings.TrimSpace(match[2])
	if strings.IndexByte(commandText, 0) >= 0 {
		return legacyCommand{}, false, true
	}
	description := label
	if suffix := strings.TrimSpace(match[3]); suffix != "" {
		if description != "" {
			description += " " + suffix
		} else {
			description = suffix
		}
	}
	id := migrationCommandID(label, commandText)
	return legacyCommand{
		id:          id,
		command:     commandText,
		description: description,
		table:       table,
		line:        line,
	}, true, true
}

func validateMigrationCommand(command legacyCommand, source string) error {
	if len(command.command) > maxCommandLen {
		return migrationLineError{line: command.line, text: source, msg: fmt.Sprintf("command exceeds the %d-character limit", maxCommandLen)}
	}
	for _, r := range command.command {
		if r < 0x20 || r == 0x7f {
			return migrationLineError{line: command.line, text: source, msg: fmt.Sprintf("command contains control character %U", r)}
		}
	}
	if len(command.description) > maxDescriptionLen {
		return migrationLineError{line: command.line, text: source, msg: fmt.Sprintf("command description exceeds the %d-character limit", maxDescriptionLen)}
	}
	return nil
}

func parseAcceptanceSection(lines []legacyLine) ([]acceptanceMapping, error) {
	var mappings []acceptanceMapping
	seen := map[string]bool{}
	for _, line := range lines {
		if strings.TrimSpace(line.text) == "" {
			continue
		}
		match := legacyAcceptanceRE.FindStringSubmatch(strings.TrimSpace(line.text))
		if match == nil || strings.TrimSpace(match[2]) == "" {
			return nil, migrationLineError{line: line.number, text: line.text, msg: "Acceptance Evidence must use '- A<n>: `exact command`'"}
		}
		if strings.TrimSpace(match[3]) != "" {
			return nil, migrationLineError{line: line.number, text: line.text, msg: "Acceptance Evidence trailing prose has no TOML destination; keep the mapping to the exact command only"}
		}
		if seen[match[1]] {
			return nil, migrationLineError{line: line.number, text: line.text, msg: fmt.Sprintf("duplicate Acceptance Evidence mapping for %s", match[1])}
		}
		seen[match[1]] = true
		mappings = append(mappings, acceptanceMapping{itemID: match[1], command: strings.TrimSpace(match[2]), line: line.number})
	}
	return mappings, nil
}

func parsePiSection(lines []legacyLine) ([]piValue, error) {
	var values []piValue
	seen := map[string]bool{}
	for _, line := range lines {
		if strings.TrimSpace(line.text) == "" {
			continue
		}
		match := legacyKeyValueRE.FindStringSubmatch(strings.TrimSpace(line.text))
		if match == nil {
			return nil, migrationLineError{line: line.number, text: line.text, msg: "Pi Orchestrator line must be a '- key: value' entry"}
		}
		key := match[1]
		if seen[key] {
			return nil, migrationLineError{line: line.number, text: line.text, msg: fmt.Sprintf("duplicate Pi Orchestrator key %q", key)}
		}
		seen[key] = true
		if key == "review_should_fix" {
			return nil, migrationLineError{line: line.number, text: line.text, msg: "review_should_fix has no destination in runners.toml; it is a review policy, not routing"}
		}
		if !migrationPiKeys[key] {
			return nil, migrationLineError{line: line.number, text: line.text, msg: fmt.Sprintf("unknown Pi Orchestrator key %q; refusing to guess its TOML destination", key)}
		}
		value := strings.TrimSpace(match[2])
		if value == "" {
			return nil, migrationLineError{line: line.number, text: line.text, msg: fmt.Sprintf("Pi Orchestrator key %q has an empty value", key)}
		}
		values = append(values, piValue{key: key, value: value, line: line.number})
	}
	return values, nil
}

func validateLegacyCommands(commands []legacyCommand, acceptance []acceptanceMapping) error {
	ids := map[string]legacyCommand{}
	texts := map[string]legacyCommand{}
	for _, command := range commands {
		if previous, ok := ids[command.id]; ok {
			return migrationLineError{line: command.line, text: command.command, msg: fmt.Sprintf("command id %q is also used on line %d; command ids must be unique", command.id, previous.line)}
		}
		if previous, ok := texts[command.command]; ok {
			return migrationLineError{line: command.line, text: command.command, msg: fmt.Sprintf("command is duplicated from line %d; one command cannot be authorised in two tables", previous.line)}
		}
		ids[command.id] = command
		texts[command.command] = command
	}
	byText := map[string][]legacyCommand{}
	for _, command := range commands {
		if command.table == "environment" {
			continue
		}
		byText[command.command] = append(byText[command.command], command)
	}
	for _, item := range acceptance {
		matches := byText[item.command]
		if len(matches) != 1 {
			return migrationLineError{line: item.line, text: item.command, msg: fmt.Sprintf("Acceptance Evidence %s must match exactly one Testing or Closeout Evidence command", item.itemID)}
		}
	}
	return nil
}

func buildMigrationTables(legacy legacyConfig) ([]migrateTable, error) {
	tables := make([]migrateTable, 0, 16)
	add := func(path string, assignment migrateAssignment) {
		for i := range tables {
			if tables[i].path == path {
				tables[i].assignments = append(tables[i].assignments, assignment)
				return
			}
		}
		tables = append(tables, migrateTable{path: path, assignments: []migrateAssignment{assignment}})
	}

	if len(legacy.testingKeep) > 0 {
		notes := notesText(trimNoteBlankLines(legacy.testingKeep))
		add("testing", migrateAssignment{table: "testing", key: "notes", value: strconv.Quote(notes), stringValue: &notes, line: legacy.testingKeep[0].number})
	}
	for _, command := range legacy.commands {
		if command.table == "testing" {
			add("testing.commands", commandAssignment(command))
		} else if command.table == "closeout evidence" {
			add("evidence.commands", commandAssignment(command))
		} else if command.table == "environment" {
			add("environment.commands", commandAssignment(command))
		}
	}
	for _, item := range legacy.acceptance {
		var commandID string
		for _, command := range legacy.commands {
			if command.command == item.command && command.table != "environment" {
				commandID = command.id
				break
			}
		}
		if commandID == "" {
			return nil, migrationLineError{line: item.line, text: item.command, msg: fmt.Sprintf("Acceptance Evidence %s has no Testing or Closeout Evidence command", item.itemID)}
		}
		value := commandID
		itemCopy := item
		add("evidence.acceptance", migrateAssignment{table: "evidence.acceptance", key: item.itemID, value: strconv.Quote(value), stringValue: &value, acceptance: &itemCopy, line: item.line})
	}

	piTables, err := buildPiTables(legacy.pi)
	if err != nil {
		return nil, err
	}
	for _, table := range piTables {
		tables = append(tables, table)
	}
	return tables, nil
}

func commandAssignment(command legacyCommand) migrateAssignment {
	value := "{ command = " + strconv.Quote(command.command)
	if command.description != "" {
		value += ", description = " + strconv.Quote(command.description)
	}
	value += " }"
	copy := command
	return migrateAssignment{table: command.table, key: command.id, value: value, command: &copy, line: command.line}
}

func buildPiTables(values []piValue) ([]migrateTable, error) {
	if len(values) == 0 {
		return nil, nil
	}
	tables := make([]migrateTable, 0, 8)
	add := func(path, key, value string, line int) {
		for i := range tables {
			if tables[i].path == path {
				tables[i].assignments = append(tables[i].assignments, migrateAssignment{table: path, key: key, value: value, line: line, stringValue: stringPointer(value)})
				return
			}
		}
		tables = append(tables, migrateTable{path: path, assignments: []migrateAssignment{{table: path, key: key, value: value, line: line, stringValue: stringPointer(value)}}})
	}

	// A Pi block has no explicit kind field. The existing schema requires one
	// on every role, so the implied kind is made explicit in each migrated role.
	ensureRole := func(path string, line int) {
		if strings.Contains(path, ".tiers.") {
			return
		}
		for _, table := range tables {
			if table.path == path {
				for _, assignment := range table.assignments {
					if assignment.key == "kind" {
						return
					}
				}
			}
		}
		add(path, "kind", strconv.Quote("pi"), line)
	}
	ensureRole("roles.implement", values[0].line)

	for _, item := range values {
		if item.key == "max_parallel" {
			maxParallel, err := strconv.Atoi(item.value)
			if err != nil || maxParallel < 1 {
				return nil, migrationLineError{line: item.line, text: item.value, msg: "max_parallel must be a positive integer"}
			}
			maxCopy := maxParallel
			found := false
			for i := range tables {
				if tables[i].path == "orchestration" {
					tables[i].assignments = append(tables[i].assignments, migrateAssignment{table: "orchestration", key: "max_parallel", value: strconv.Itoa(maxParallel), intValue: &maxCopy, line: item.line})
					found = true
					break
				}
			}
			if !found {
				tables = append(tables, migrateTable{path: "orchestration", assignments: []migrateAssignment{{table: "orchestration", key: "max_parallel", value: strconv.Itoa(maxParallel), intValue: &maxCopy, line: item.line}}})
			}
			continue
		}

		rolePath, field := piRoleDestination(item.key)
		model, effort, err := splitPiModel(item.value)
		if err != nil {
			return nil, migrationLineError{line: item.line, text: item.value, msg: err.Error()}
		}
		ensureRole(rolePath, item.line)
		add(rolePath, field, strconv.Quote(model), item.line)
		if effort != "" {
			add(rolePath, "effort", strconv.Quote(effort), item.line)
		}
	}

	return tables, nil
}

func piRoleDestination(key string) (string, string) {
	switch key {
	case "planner_model":
		return "roles.plan", "model"
	case "scout_model":
		return "roles.scout", "model"
	case "implement_economy_model":
		return "roles.implement.tiers.economy", "model"
	case "implement_balanced_model":
		return "roles.implement.tiers.balanced", "model"
	case "implement_strong_model":
		return "roles.implement.tiers.strong", "model"
	case "review_model":
		return "roles.review", "model"
	case "closeout_model":
		return "roles.closeout", "model"
	default:
		return "", ""
	}
}

func splitPiModel(raw string) (string, string, error) {
	model := strings.TrimSpace(raw)
	effort := ""
	if colon := strings.LastIndexByte(model, ':'); colon >= 0 {
		effort = model[colon+1:]
		model = model[:colon]
		if !isKnownEffort(effort) {
			return "", "", fmt.Errorf("model effort %q is not one of %s", effort, joinEfforts())
		}
	}
	if model == "" || !modelPattern.MatchString(model) {
		return "", "", fmt.Errorf("model %q is not a valid runners.toml model id", model)
	}
	return model, effort, nil
}

func isKnownEffort(value string) bool {
	for _, effort := range Efforts {
		if string(effort) == value {
			return true
		}
	}
	return false
}

func migrationCommandID(label, command string) string {
	seed := label
	if strings.TrimSpace(seed) == "" {
		seed = command
	}
	var b strings.Builder
	lastDash := false
	for _, r := range strings.ToLower(seed) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
			lastDash = false
		} else if !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}
	id := strings.Trim(b.String(), "-")
	if len(id) > maxCommandIDLen {
		id = strings.TrimRight(id[:maxCommandIDLen], "-")
	}
	if id != "" {
		return id
	}
	hash := sha1.Sum([]byte(command))
	return "command-" + hex.EncodeToString(hash[:4])
}

func stripMarkdownBullet(line string) string {
	if len(line) >= 2 && (line[0] == '-' || line[0] == '*' || line[0] == '+') && (line[1] == ' ' || line[1] == '\t') {
		return strings.TrimSpace(line[2:])
	}
	return line
}

func trimNoteBlankLines(lines []legacyLine) []legacyLine {
	start := 0
	for start < len(lines) && strings.TrimSpace(lines[start].text) == "" {
		start++
	}
	end := len(lines)
	for end > start && strings.TrimSpace(lines[end-1].text) == "" {
		end--
	}
	return lines[start:end]
}

func notesText(lines []legacyLine) string {
	parts := make([]string, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line.text) == "" {
			parts = append(parts, "")
			continue
		}
		parts = append(parts, stripMarkdownBullet(strings.TrimSpace(line.text)))
	}
	return strings.Join(parts, "\n")
}

func stringPointer(value string) *string { return &value }

func rewriteLegacyConfig(legacy legacyConfig) string {
	remove := make(map[int]bool)
	keepTesting := make(map[int]bool)
	if testing := legacy.sections["testing"]; testing != nil {
		for _, line := range legacy.testingKeep {
			keepTesting[line.number-1] = true
		}
		for i := testing.heading; i < testing.end; i++ {
			remove[i] = true
		}
		if len(legacy.testingKeep) > 0 {
			remove[testing.heading] = false
			for i := testing.heading + 1; i < testing.end; i++ {
				if keepTesting[i] {
					remove[i] = false
				} else {
					remove[i] = true
				}
			}
		}
	}
	for _, name := range []string{"closeout evidence commands", "acceptance evidence", "pi orchestrator", "environment"} {
		if section := legacy.sections[name]; section != nil {
			for i := section.heading; i < section.end; i++ {
				remove[i] = true
			}
		}
	}

	kept := make([]string, 0, len(legacy.lines))
	for i, line := range legacy.lines {
		if remove[i] {
			continue
		}
		kept = append(kept, line)
	}
	result := strings.Join(kept, legacy.lineEnding)
	if legacy.trailingNewline {
		result += legacy.lineEnding
	}
	return result
}

type tomlDocument struct {
	lines  []string
	tables map[string]tomlTableSpan
}

type tomlTableSpan struct {
	header int
	end    int
}

func mergeRunnersTOML(original []byte, tables []migrateTable) ([]byte, []string, error) {
	originalText := string(original)
	lineEnding := "\n"
	if strings.Contains(originalText, "\r\n") {
		lineEnding = "\r\n"
	} else if strings.Contains(originalText, "\r") {
		lineEnding = "\r"
	}
	text := strings.ReplaceAll(originalText, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	hadTrailingNewline := strings.HasSuffix(text, "\n")
	lines := strings.Split(text, "\n")
	if len(lines) == 1 && lines[0] == "" {
		lines = nil
	} else if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	var existing Config
	metadata, err := toml.Decode(text, &existing)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot parse existing .tick/runners.toml: %w", err)
	}
	doc := tomlDocument{lines: lines, tables: findTomlTables(lines)}
	insertions := map[int][]string{}
	appendBlocks := make([][]string, 0)
	warnings := make([]string, 0)
	for _, table := range tables {
		pending := make([]migrateAssignment, 0, len(table.assignments))
		for _, assignment := range table.assignments {
			has, equal := existingAssignment(existing, metadata, table.path, assignment)
			if has && !equal {
				path := table.path + "." + assignment.key
				if !safeToPreserveExisting(existing, table.path, assignment) {
					return nil, nil, migrationConflictError{line: assignment.line, path: path, msg: "existing key has a different value; refusing to overwrite it"}
				}
				warnings = append(warnings, fmt.Sprintf(".tick/config.md:%d: preserved existing %s; legacy value was not applied", assignment.line, path))
				continue
			}
			if !has {
				pending = append(pending, assignment)
			}
		}
		if len(pending) == 0 {
			continue
		}
		block := make([]string, 0, len(pending)+2)
		for _, assignment := range pending {
			block = append(block, assignment.key+" = "+assignment.value)
		}
		if span, ok := doc.tables[table.path]; ok {
			insertions[span.end] = append(insertions[span.end], block...)
		} else if before, ok := missingTableInsertionIndex(doc.tables, table.path); ok {
			insertions[before] = append(insertions[before], append([]string{tableHeader(table.path)}, block...)...)
		} else {
			blockWithHeader := []string{tableHeader(table.path)}
			blockWithHeader = append(blockWithHeader, block...)
			appendBlocks = append(appendBlocks, blockWithHeader)
		}
	}

	merged := make([]string, 0, len(lines)+len(tables)*3)
	for i := 0; i <= len(lines); i++ {
		if additions := insertions[i]; len(additions) > 0 {
			if len(merged) > 0 && merged[len(merged)-1] != "" {
				merged = append(merged, "")
			}
			merged = append(merged, additions...)
		}
		if i == len(lines) {
			break
		}
		merged = append(merged, lines[i])
	}
	for _, block := range appendBlocks {
		for len(merged) > 0 && merged[len(merged)-1] == "" {
			merged = merged[:len(merged)-1]
		}
		if len(merged) > 0 {
			merged = append(merged, "")
		}
		merged = append(merged, block...)
	}
	if len(merged) == 0 {
		return []byte{}, warnings, nil
	}
	result := strings.Join(merged, lineEnding)
	if hadTrailingNewline || len(original) == 0 {
		result += lineEnding
	}
	return []byte(result), warnings, nil
}

func findTomlTables(lines []string) map[string]tomlTableSpan {
	tables := map[string]tomlTableSpan{}
	for i, line := range lines {
		match := tomlTableRE.FindStringSubmatch(line)
		if match == nil {
			continue
		}
		path := strings.TrimSpace(match[1])
		if previous, ok := tables[path]; ok {
			previous.end = i
			tables[path] = previous
		}
		for name, span := range tables {
			if span.end == len(lines) && span.header < i {
				span.end = i
				tables[name] = span
			}
		}
		tables[path] = tomlTableSpan{header: i, end: len(lines)}
	}
	return tables
}

func tableHeader(path string) string { return "[" + path + "]" }

func missingTableInsertionIndex(tables map[string]tomlTableSpan, path string) (int, bool) {
	best := 0
	found := false
	prefix := path + "."
	for existingPath, span := range tables {
		if !strings.HasPrefix(existingPath, prefix) {
			continue
		}
		if !found || span.header < best {
			best = span.header
			found = true
		}
	}
	return best, found
}

func existingAssignment(cfg Config, md toml.MetaData, table string, assignment migrateAssignment) (bool, bool) {
	path := strings.Split(table, ".")
	key := assignment.key
	if len(path) == 1 && path[0] == "testing" && key == "notes" && cfg.Testing != nil && md.IsDefined("testing", "notes") {
		return true, cfg.Testing.Notes == derefString(assignment.stringValue)
	}
	if len(path) == 2 && path[0] == "testing" && path[1] == "commands" && cfg.Testing != nil {
		return existingCommand(cfg.Testing.Commands, md, []string{"testing", "commands", key}, assignment)
	}
	if len(path) == 2 && path[0] == "evidence" && path[1] == "commands" && cfg.Evidence != nil {
		return existingCommand(cfg.Evidence.Commands, md, []string{"evidence", "commands", key}, assignment)
	}
	if len(path) == 2 && path[0] == "environment" && path[1] == "commands" && cfg.Environment != nil {
		return existingCommand(cfg.Environment.Commands, md, []string{"environment", "commands", key}, assignment)
	}
	if len(path) == 2 && path[0] == "evidence" && path[1] == "acceptance" && cfg.Evidence != nil && md.IsDefined("evidence", "acceptance", key) {
		return true, cfg.Evidence.Acceptance[key] == derefString(assignment.stringValue)
	}
	if len(path) == 1 && path[0] == "orchestration" && key == "max_parallel" && cfg.Orchestration != nil && md.IsDefined("orchestration", key) {
		return true, assignment.intValue != nil && cfg.Orchestration.MaxParallel == *assignment.intValue
	}
	if len(path) >= 2 && path[0] == "roles" {
		role, ok := cfg.Roles[path[1]]
		if !ok || role == nil {
			return false, false
		}
		if len(path) == 2 {
			return roleFieldValue(role, md, path[1], key, assignment)
		}
		if len(path) == 4 && path[2] == "tiers" {
			variant, ok := role.Tiers[path[3]]
			if !ok || variant == nil {
				return false, false
			}
			return tierFieldValue(variant, md, path[1], path[3], key, assignment)
		}
	}
	return false, false
}

func safeToPreserveExisting(cfg Config, table string, assignment migrateAssignment) bool {
	if assignment.acceptance != nil {
		return false
	}
	if assignment.command == nil {
		return true
	}
	commands := Commands(nil)
	switch table {
	case "testing.commands":
		if cfg.Testing != nil {
			commands = cfg.Testing.Commands
		}
	case "evidence.commands":
		if cfg.Evidence != nil {
			commands = cfg.Evidence.Commands
		}
	case "environment.commands":
		if cfg.Environment != nil {
			commands = cfg.Environment.Commands
		}
	}
	existing, ok := commands[assignment.key]
	return ok && existing != nil && existing.Command == assignment.command.command
}

func existingCommand(commands Commands, md toml.MetaData, path []string, assignment migrateAssignment) (bool, bool) {
	command, ok := commands[assignment.key]
	if !ok || command == nil || !md.IsDefined(path...) {
		return false, false
	}
	if assignment.command == nil {
		return true, false
	}
	if command.Command != assignment.command.command {
		return true, false
	}
	if assignment.command.description != "" && command.Description != assignment.command.description {
		return true, false
	}
	return true, true
}

func roleFieldValue(role *Role, md toml.MetaData, roleName, key string, assignment migrateAssignment) (bool, bool) {
	if !md.IsDefined("roles", roleName, key) {
		return false, false
	}
	switch key {
	case "kind":
		return true, assignment.value == strconv.Quote(role.Kind)
	case "model":
		return true, assignment.value == strconv.Quote(role.Model)
	case "effort":
		return true, assignment.value == strconv.Quote(string(role.Effort))
	default:
		return true, false
	}
}

func tierFieldValue(variant *TierVariant, md toml.MetaData, roleName, tierName, key string, assignment migrateAssignment) (bool, bool) {
	if !md.IsDefined("roles", roleName, "tiers", tierName, key) {
		return false, false
	}
	switch key {
	case "kind":
		return true, assignment.value == strconv.Quote(variant.Kind)
	case "model":
		return true, assignment.value == strconv.Quote(variant.Model)
	case "effort":
		return true, assignment.value == strconv.Quote(string(variant.Effort))
	default:
		return true, false
	}
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func bytesEqual(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
