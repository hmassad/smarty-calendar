# React Calendar

the first time, run `yarn install`

run with `yarn start`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 🐞 Bugs

- can't drag an event that finishes after maxHour
- title not shown when pointer-events: none

## 🚨 Pending

- look and feel of events (creating, dragging, open popup, normal)

## ✨ Nice to have

- mouse move: shadow with default duration when a user is not dragging but moving the mouse over the calendar
- support events spanning more than one day, drawing and drag moving
- multiline ellipsis for all day events
- use colors from events
- vertical slots of 30 minutes
- edit/confirm event popup
- improve how overlapped events are shown
- add exclusion zones, like working hours, where you can only drag inside those boxes

## 🚀 Improvement Opportunities

- replace useCallback's for one useReducer to prevent some double renders

## ✅ Done

- this week view
- adjust to 10 min intervals on drag
- drag change start or end
- drag move
- allow event deletion
- variable pixel height
- prevent rendering of unaffected components on mouse move
- wrong calculation of time in events, it calculates 4 when it must be 5, must review
- minimum event duration
- do not allow overlapping of events while dragging
- drag events from one day to the other
- when minHour and maxHour are not default, dragging doesn't work
- with minHour can't change or move an event
- single day view, three day view, work week view
- generic dates, specific dates
- filter clicks outside calendarContentRef (mouse down)
- differentiate between events and slots: we create, edit and delete slots, events are passed
- interval creation mode / event creation mode, events and slots don't interact with each other
- don't let creation of new slots if they don't fit (mouse down and default duration)
- when moving an event past the bottom of the calendar, it moves to the next day (mouse move)
- allow popups on top of calendar
