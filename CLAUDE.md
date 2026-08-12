# Square Dance Check-In App

Building a check-in system for CMDF square dances: Airtable (backend) + Front-end + Mailchimp (newsletter sync on adult check-in).

## Before starting work

Read the plan first: `~/code/dev-vault/dev-vault/00_Inbox/in-progress/Square Dance Check-in with mailchimp integration.md`

It is the source of truth for the data model, view/field mapping, and Mailchimp sync design. It is not perfect — deviate from it when Airtable's actual behavior forces a different approach, but note the deviation (see below).

The evolving web app architecture is in this folder `~/code/dev-vault/dev-vault/Atlas 🧠/💻 Product & Engineering/Square Dance Check-In Web App.md`. 

## Logging updates

Every session that changes the Airtable base, imports data, builds  views, or wires up Mailchimp must log what happened in a `## Build Progress Log` entry (dated, most recent first) at the bottom of that same Square Dance Check-in with mail chimp integration plan file — what was built, what deviated from the plan and why, and what's still open. Update the plan to reflect what actually worked and point to the log, where there were changes.

Changes to the app design, testing, user workflows, etc. should be reflected reflected in the Square Dance Check-In Web App.

Ensure you update status in these documents since you will review them at each session start. When necessary, create both a style guide for tailwinds and README.md in this code directory for documenting details of the app, starting-stopping, security, etc.

## Airtable reference

Base: **CMDF Square Dances** (`appHYcz1rdao0Evm6`). Tables: Parties, Adults, Visits, Events. Use `list_tables_for_base` for current field IDs rather than assuming they're stable across sessions.
