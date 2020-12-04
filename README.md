# React Calendar

the first time, run `yarn install`

run with `yarn start`

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 🐞 Bugs

- can't drag an event that finishes after maxHour
- don't let create new slots if they don't fit (mouse down and default duration)

## 🚨 Pending

- edit/confirm event popup
- look and feel of events (creating, dragging, open popup, normal)
- interval creation mode / event creation mode, events and slots don't interact with each other

## ✨ Nice to have

- mouse move: shadow with default duration when a user is not dragging but moving the mouse over the calendar
- support events spanning more than one day, drawing and drag moving
- multiline ellipsis for all day events
- use colors from events
- vertical slots of 30 minutes
- add exclusion zones, like working hours

## 🚀 Improvement Opportunities

- 4 initial renders, should be 2
- double render on every time update

## ✅ Done

- this week view
- adjust to 10 min intervals on drag
- drag change start or end
- drag move
- allow event deletion
- variable pixel height
- prevent render of unaffected components on mouse move
- wrong calculation of time in events, it calculates 4 when it must be 5, must review
- minimum event duration
- do not allow overlapping of events while dragging
- drag events from one day to the other
- when minHour and maxHour are not default, dragging doesn't work
- with minHour can't change or move an event
- single day view, three day view, work week view
- generic dates, specific dates
