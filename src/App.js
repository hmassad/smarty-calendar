import React, {useState} from 'react';
import './App.css'
import moment from 'moment-timezone';
import Calendar, {CalendarType, CalendarView, EditionMode} from './Calendar';

const DayHeader = ({date, events}) => {
  return (
    <div>
      {date.toLocaleString()}<br/>
      all day: {`${events.filter(event => event.allDay).length}`}<br/>
      other: {`${events.filter(event => !event.allDay).length}`}
    </div>
  );
}

const App = () => {

  const [timeZone] = useState('America/Argentina/Buenos_Aires');
  const [currentDate, setCurrentDate] = useState(moment().tz(timeZone));

  const [calendarType, setCalendarType] = useState(CalendarType.SPECIFIC);
  const [calendarView, setCalendarView] = useState(CalendarView.WEEK);
  const [editionMode, setEditionMode] = useState(EditionMode.EVENTS);

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

  const [slots, setSlots] = useState(() => {
    const today = moment().tz(timeZone).startOf('days');
    return [
      {
        start: today.clone().add(10, 'hours').toDate(),
        end: today.clone().add(13, 'hours').toDate(),
        summary: 'slot 10:30am to 12pm'
      },
    ];
  });

  const [weeklyRecurringSlots, setWeeklyRecurringSlots] = useState(() => {
    return [
      {
        dayOfWeek: 2,
        startMinutes: 9.1 * 60,
        endMinutes: 23.3 * 60,
      },
      {
        dayOfWeek: 3,
        startMinutes: 9 * 60,
        endMinutes: 13 * 60,
      },
    ];
  });

  const handleCreateEvent = event => {
    setEvents(prev => [...prev, event]);
  };

  const handleChangeEvent = (originalEvent, newEvent) => {
    setEvents(prev => {
      const newEvents = prev.filter(event => event !== originalEvent);
      newEvents.push({...originalEvent, ...newEvent});
      return newEvents;
    })
  }

  const handleDeleteEvent = (event) => {
    setEvents(prev => {
      return prev.filter(event1 => event !== event1);
    });
  };

  const handleCreateSlot = event => {
    setSlots(prev => [...prev, event]);
  };

  const handleChangeSlot = (originalEvent, newEvent) => {
    setSlots(prev => {
      const arr = prev.filter(event => event !== originalEvent);
      arr.push({...originalEvent, ...newEvent});
      return arr;
    });
  };

  const handleDeleteSlot = (deletedSlot) => {
    setSlots(prev => {
      return prev.filter(event1 => deletedSlot !== event1);
    });
  };

  const handleCreateWeeklyRecurringSlot = event => {
    setWeeklyRecurringSlots(prev => [...prev, event]);
  };

  const handleChangeWeeklyRecurringSlot = (originalEvent, newEvent) => {
    setWeeklyRecurringSlots(prev => {
      const arr = prev.filter(item => item !== originalEvent);
      arr.push({...originalEvent, ...newEvent});
      return arr;
    });
  };

  const handleDeleteWeeklyRecurringSlot = (event) => {
    setWeeklyRecurringSlots(prev => {
      return prev.filter(event1 => event !== event1);
    });
  };

  const changeDate = (amount, unit) => {
    setCurrentDate(prev => moment(prev).tz(timeZone).add(amount, unit));
  };

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
          <label>EditionMode: </label>
          <select value={editionMode} onChange={e => setEditionMode(e.target.value)}>
            <option label={EditionMode.NONE} value={EditionMode.NONE}/>
            <option label={EditionMode.SLOTS} value={EditionMode.SLOTS}/>
            <option label={EditionMode.EVENTS} value={EditionMode.EVENTS}/>
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
        currentDate={currentDate} timeZone={timeZone}
        editionMode={editionMode}
        events={events} slots={slots} weeklyRecurringSlots={weeklyRecurringSlots}
        onCreateEvent={handleCreateEvent} onChangeEvent={handleChangeEvent} onDeleteEvent={handleDeleteEvent}
        onCreateSlot={handleCreateSlot} onChangeSlot={handleChangeSlot} onDeleteSlot={handleDeleteSlot}
        onCreateWeeklyRecurringSlot={handleCreateWeeklyRecurringSlot}
        onChangeWeeklyRecurringSlot={handleChangeWeeklyRecurringSlot}
        onDeleteWeeklyRecurringSlot={handleDeleteWeeklyRecurringSlot}
        pixelsPerHour={50} minHour={0} maxHour={24}
        DayHeader={DayHeader}
      />
      <div>footer</div>
    </div>
  )
}

export default App;
