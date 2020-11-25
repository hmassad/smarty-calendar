import React, { useState } from 'react';
import './App.css'
import moment from 'moment-timezone';
import Calendar from './Calendar';

function App() {

  const [timeZone] = useState('America/Argentina/Buenos_Aires');
  const [currentDate] = useState(moment().tz(timeZone));

  const [events, setAllDayEvents] = useState([
    {
      start: moment().tz(timeZone).startOf('days').add(10.5, 'hours').toDate(),
      end: moment().tz(timeZone).startOf('days').add(12, 'hours').toDate(),
      summary: 'meeting 10:30am to 12pm'
    },
    {
      start: moment().tz(timeZone).startOf('days').add(15, 'hours').toDate(),
      end: moment().tz(timeZone).startOf('days').add(24, 'hours').toDate(),
      summary: 'meeting 3pm to 12am'
    },
    {
      start: moment().tz(timeZone).startOf('days').add(1, 'days').toDate(),
      allDay: true,
      summary: 'Some holiday or all day event'
    },
  ]);

  const handleCreate = e => {
    console.debug('handleCreate', e);
  };

  return (<>
    <h1>Some title</h1>
    <Calendar currentDate={currentDate} timeZone={timeZone} events={events} onCreate={handleCreate} style={{height: 800}}/>
  </>)
}

export default App;
