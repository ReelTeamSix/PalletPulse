# PalletPulse Project Kickoff Prompt

> **Instructions:** Copy everything below the line and paste it into a new Claude conversation to begin development.

---

## 🚀 Project Kickoff: PalletPulse

You are about to build **PalletPulse**, a React Native mobile app for pallet/mystery box resellers. This is an autonomous development project with human checkpoints.

### Required Reading

Before writing any code, read these files completely:

1. **`PALLETPULSE_ONESHOT_CONTEXT.md`** — Complete project requirements, business logic, database schema, and feature specifications
2. **`CLAUDE.md`** — Development rules, coding standards, git workflow, and autonomous workflow guidelines

### Your Mission

Build the complete MVP as defined in the context document, following the phased approach in CLAUDE.md.

### How We'll Work Together

1. **You work autonomously within each phase** — Make decisions, write code, solve problems
2. **You STOP at each checkpoint** — Wait for my approval before starting the next phase
3. **You maintain PROGRESS.md** — Keep it updated with current status, completed tasks, and blockers
4. **You ask when uncertain** — Better to clarify than assume wrong
5. **You use git properly** — Feature branches, semantic commits, no direct pushes to main

### Starting Point

There is no existing code. You will create the project from scratch.

**Working directory:** `c:\Users\crsto\Documents\dev\palletpulse` (create this folder)

### Phase 1 Expectations

For Phase 1 (Project Setup), I expect:

1. Create Expo + React Native project with TypeScript
2. Install all dependencies (Supabase, Zustand, React Navigation, etc.)
3. Set up folder structure as defined in CLAUDE.md
4. Create `.env.example` with required variables
5. Create initial `PROGRESS.md`
6. Verify app runs with `npx expo start`

### Communication Style

- Be concise but thorough
- Show me what you built, not line-by-line narration
- Highlight decisions you made and why
- List any questions or blockers clearly
- Use the checkpoint format from CLAUDE.md when completing phases

### Let's Begin

Start with Phase 1: Project Setup. 

1. First, confirm you've read both documents by summarizing:
   - The core business purpose (1-2 sentences)
   - The tech stack
   - The 11 development phases

2. Then create a task list for Phase 1 and begin execution.

**I'll be here to test on my device and approve each checkpoint. Let's build something great!** 🚀

---

## Alternative Kickoff: Resume After Interruption

If you need to resume work after a conversation break:

```
You are continuing work on PalletPulse.

Read these files to get context:
- PALLETPULSE_ONESHOT_CONTEXT.md (project requirements)
- CLAUDE.md (development rules)
- PROGRESS.md (current status)

Resume from where you left off. Check PROGRESS.md for:
- Current phase
- Completed tasks
- Any pending questions

Continue working and update PROGRESS.md as you go.
```

---

## Alternative Kickoff: Start Specific Phase

If you want to start from a specific phase:

```
You are building PalletPulse.

Read these files:
- PALLETPULSE_ONESHOT_CONTEXT.md
- CLAUDE.md

We are starting Phase [N]: [Phase Name].

Assume all previous phases are complete and approved.

Begin Phase [N] now. Create a task list first, then execute.
```

---

## Tips for Best Results

1. **Keep conversations focused** — One phase per conversation if needed
2. **Save context** — If conversation gets long, start new one with resume prompt
3. **Test frequently** — Don't let Claude build for hours without you testing
4. **Be specific with feedback** — "The button doesn't work" < "Tapping 'Add Pallet' shows a blank screen instead of the form"
5. **Trust but verify** — Claude is good but not perfect, always test on device

---

## Quick Commands

| Command | Use When |
|---------|----------|
| `approved` | Phase checkpoint passed, continue to next |
| `approved with notes: [feedback]` | Passed but make these changes first |
| `needs revision: [issues]` | Fix these issues before continuing |
| `pause` | Stop work, I'll resume later |
| `show progress` | Display current PROGRESS.md status |
| `explain [decision]` | Explain why you chose a certain approach |

---

**Good luck! 🎉**
