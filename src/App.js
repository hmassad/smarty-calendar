import React, {useState} from 'react';
import './App.css'
import moment from 'moment-timezone';
import Calendar, {CalendarType, CalendarView} from './Calendar';

const App = () => {

  const [timeZone] = useState('America/Argentina/Buenos_Aires');
  const [currentDate, setCurrentDate] = useState(moment().tz(timeZone));

  const [calendarType, setCalendarType] = useState(CalendarType.SPECIFIC);
  const [calendarView, setCalendarView] = useState(CalendarView.WEEK);

  const [events, setEvents] = useState(() => {
    const today = moment().tz(timeZone).startOf('days');
    const yesterday = today.clone().subtract(1, 'days');
    const tomorrow = today.clone().add(1, 'days');
    return [
      {
        start: moment('2020-11-23T04:30:00.000-03:00').toDate(),
        end: moment('2020-11-23T14:30:00.000-03:00').toDate(),
        summary: '24 con dani'
      },
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

  const changeDate = (amount, unit) => {
    setCurrentDate(prev => moment(prev).tz(timeZone).add(amount, unit));
  }

  return (
    <div style={{height: "100vh", display: "flex", flexDirection: "column"}}>
      <div style={{display: "flex", flexWrap: "wrap", alignItems: "baseline", paddingLeft: 12, paddingRight: 12}}>
        <h1 style={{flex: 1}}>Smarty Calendar</h1>
        <div style={{marginLeft: 12}}>
          <label>CalendarType: </label>
          <select value={calendarType} onChange={e => setCalendarType(e.target.value)}>
            <option label={CalendarType.SPECIFIC} value={CalendarType.SPECIFIC}/>
            <option label={CalendarType.GENERIC} value={CalendarType.GENERIC}/>
          </select>
        </div>
        <div style={{marginLeft: 12}}>
          <label>CalendarView: </label>
          <select value={calendarView} onChange={e => setCalendarView(e.target.value)}>
            <option label={CalendarView.SINGLE_DAY} value={CalendarView.SINGLE_DAY}/>
            <option label={CalendarView.WORK_WEEK} value={CalendarView.WORK_WEEK}/>
            <option label={CalendarView.WEEK} value={CalendarView.WEEK}/>
            <option label={CalendarView.THREE_DAYS} value={CalendarView.THREE_DAYS}/>
          </select>
        </div>
        <div style={{marginLeft: 12}}>
          <label>CurrentDate: </label>
          <button onClick={() => changeDate(-1, 'years')}>-1 year</button>
          <button onClick={() => changeDate(-1, 'weeks')}>-1 week</button>
          <button onClick={() => changeDate(-1, 'days')}>-1 day</button>
          <span style={{paddingLeft: 6, paddingRight: 6}}>
            {moment(currentDate).tz(timeZone).format('DD/MM/yyyy')}
          </span>
          <button onClick={() => changeDate(1, 'days')}>+1 day</button>
          <button onClick={() => changeDate(1, 'weeks')}>+1 week</button>
          <button onClick={() => changeDate(1, 'years')}>+1 year</button>
        </div>
      </div>
      <Calendar
        calendarType={calendarType} calendarView={calendarView}
        currentDate={currentDate} timeZone={timeZone} events={events}
        onCreate={handleCreate} onChange={handleChange} onDelete={handleDelete}
        pixelsPerHour={100} minHour={0} maxHour={24}
      />
      <div>footer</div>
    </div>
  )
}

export default App;
