import React, { useState } from 'react';
import './App.css'
import moment from 'moment-timezone';
import Calendar from './Calendar';

function App() {

  const [timeZone] = useState('America/Argentina/Buenos_Aires');
  const [currentDate] = useState(moment().tz(timeZone));

  const [events, setEvents] = useState(() => {
    const today = moment().tz(timeZone).startOf('days');
    const yesterday = today.clone().subtract(1, 'days');
    const tomorrow = today.clone().add(1, 'days');
    return [
      {
        start: yesterday.clone().add(11, 'hours').add(15, 'minutes').toDate(),
        end: yesterday.clone().add(12, 'hours').add(10, 'minutes').toDate(),
        summary: 'yesterday 11:15a to 12:10a'
      },
      {
        start: tomorrow.clone().add(3, 'hours').toDate(),
        end: tomorrow.clone().add(7, 'hours').toDate(),
        summary: 'meeting 3am to 7am'
      },
      {
        start: today.clone().add(10.5, 'hours').toDate(),
        end: today.clone().add(12, 'hours').toDate(),
        summary: 'meeting 10:30am to 12pm'
      },
      {
        start: yesterday.clone().add(15, 'hours').toDate(),
        end: yesterday.clone().add(24, 'hours').toDate(),
        summary: 'meeting 3pm to 12am'
      },
      {
        start: tomorrow.clone().toDate(),
        allDay: true,
        summary: 'Some holiday or all day event 1234 1234 1234 1234 1234 1234 '
      },
    ];
  });

  const handleCreate = event => {
    setEvents(prev => [...prev, event]);
  };

  const handleChange = (originalEvent, newEvent) => {
    setEvents(prev => {
      const newEvents = prev.filter(event => event !== originalEvent);
      newEvents.push({...originalEvent, ...newEvent});
      return newEvents;
    })
  }

  const handleDelete = (event) => {
    setEvents(prev => {
      return prev.filter(event1 => event !== event1);
    })
  }

  return (<>
    <h1>Some title</h1>
    <Calendar currentDate={currentDate} timeZone={timeZone} events={events} onCreate={handleCreate} onChange={handleChange} onDelete={handleDelete}
      style={{height: 500}} pixelsPerHour={40} minHour={0} maxHour={24}/>
  </>)
}

export default App;
