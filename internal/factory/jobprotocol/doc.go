// Package jobprotocol is the Go reader for contracts/job-protocol.json — the
// versioned record schemas for ticfac's four-operation executor protocol
// (SPEC §4.3), its role-result envelope (§4.4) and its evidence record
// (§10.1).
//
// There is no Go implementation of the executor protocol yet, and that is the
// point of Phase 0 step 3: the schemas are frozen *before* code moves, so the
// reconciler and every executor are written against a surface that already has
// two readers. This package is the Go half; the TypeScript half is
// cloud/factory/test/job-protocol.test.ts. A schema, a golden example or a
// refusal changed on one side only fails the other.
//
// The schemas themselves are validated with internal/tkcontract's strict JSON
// Schema subset: a keyword that subset cannot enforce makes the contract fail
// to parse rather than being quietly ignored, which is the difference between a
// contract and a decorative copy of one (contracts/README.md).
package jobprotocol

// ContractFile is contracts/job-protocol.json, relative to this package.
const ContractFile = "../../../contracts/job-protocol.json"

// Contract is the value of the file's `contract` key: the name a consumer in
// another repository asks for.
const Contract = "ticfac.job-protocol"

// SchemaIDs are the versioned identities of the seven records, in the order
// the protocol uses them. JobSpec.output_schema names a role-specific contract
// derived from RoleResult; the six others are fixed.
//
// These are duplicated here on purpose. The contract file is data; this is the
// Go side declaring what it believes that data says, so a record renamed or
// re-versioned in the file alone fails a build rather than silently changing
// what a consumer is pinned to.
var SchemaIDs = map[string]string{
	"job_spec":   "ticfac.job-spec.v1",
	"job_handle": "ticfac.job-handle.v1",
	"job_status": "ticfac.job-status.v1",
	"cancel_ack": "ticfac.cancel-ack.v1",
	"job_result": "ticfac.job-result.v1",
	"evidence":   "ticfac.evidence.v1",
	// The envelope is versioned; `result` inside it is the role-specific
	// contract named by JobSpec.output_schema.
	"role_result": "ticfac.role-result.v1",
}
