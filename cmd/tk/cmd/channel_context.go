package cmd

import (
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// One personal bot and one chat now serve MANY projects, because one cloud
// factory does. Machine routing was never the ambiguous part — the RunRoom is
// per project, a question id is unique by registration, and callback data
// carries it — but nothing put the project into the message TEXT, so two
// repositories asking the same question produced two indistinguishable
// messages. These helpers are what every command uses to say what its messages
// are about before it sends one.

// messageProject is the checkout's owner/repo pair, or empty when it cannot be
// read.
//
// Best effort on purpose: a checkout with no origin remote, or none this can
// parse, is a legitimate place to run `tk ask` from. It costs the message its
// project name; it must never cost the operator the question.
func messageProject() string {
	project, err := github.DetectProject(nil)
	if err != nil {
		return ""
	}
	return project
}

// tickMessageContext is what a message about tickID names: the checkout's
// project, the epic the tick belongs to, and the tick itself.
//
// An epic names itself as the epic and carries no tick: "epic 4f2 · tick 4f2"
// reads as two facts where there is one. A tick whose parent cannot be read
// keeps its own id and loses only the epic.
func tickMessageContext(store *tick.Store, tickID string) operator.MessageContext {
	about := operator.MessageContext{Project: messageProject(), Tick: tickID}
	if store == nil || tickID == "" {
		return about
	}
	t, err := store.Read(tickID)
	if err != nil {
		return about
	}
	if t.Type == tick.TypeEpic {
		return operator.MessageContext{Project: about.Project, Epic: t.ID}
	}
	about.Epic = t.Parent
	return about
}

// labelChannel tells ch what its messages are about, when ch can be told
// ([operator.ContextualChannel]).
func labelChannel(ch operator.Channel, about operator.MessageContext) {
	if ch == nil {
		return
	}
	operator.UseMessageContext(ch, about)
}
