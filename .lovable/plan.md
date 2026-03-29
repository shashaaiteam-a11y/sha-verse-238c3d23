

## Problem
Category and Language selectors in Create Group dialog use a separate search Input + Radix Select. The search input filters the data but the Select dropdown doesn't auto-open to show results — user has to manually click the dropdown. Also, when filtered results are empty, there's a blank dark area.

## Solution
Replace both Category and Language selectors with **Popover + Command (cmdk) combobox** pattern. Both `Popover` and `Command` components already exist in the project (`src/components/ui/popover.tsx`, `src/components/ui/command.tsx`).

## Changes (1 file only)

### `src/components/CreateGroupDialog.tsx`
- Remove the separate `Input` + `Select` combo for both Category and Language
- Replace each with a `Popover` containing a `Command` (combobox):
  - A trigger button showing current selection
  - On click opens a popover with `CommandInput` (built-in search) + `CommandList` + `CommandGroup` + `CommandItem` for each option
  - `CommandEmpty` shows "No results found" message (fixes the blank/black area)
  - Selecting an item sets the value and closes the popover
- Remove `categorySearch`, `languageSearch` state variables and `filteredCategories`, `filteredLanguages` memos (cmdk handles filtering internally)
- Add `categoryOpen` and `languageOpen` boolean states for popover control
- Import `Popover, PopoverTrigger, PopoverContent` and `Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem` plus `Check, ChevronsUpDown` icons

### No other files changed
No database, hooks, or other module changes needed.

