import React, {useState} from 'react';
import './App.css'
import moment from 'moment-timezone';
import Calendar, {CalendarType, CalendarView, EditionMode} from './Calendar';
import {colorLuminance} from "./colorUtils";

const DayHeader = ({date, timeZone, events, slots, calendarType}) => {
  return (
    <div>
      {calendarType === CalendarType.SPECIFIC ? (<>
        {moment(date).tz(timeZone).format('ddd D')}<br/>
        all day: {`${events.filter(event => event.allDay).length}`}<br/>
        events: {`${events.filter(event => !event.allDay).length}`}<br/>
        slots: {`${slots.length}`}
      </>) : (<>
        {moment(date).tz(timeZone).format('ddd')}
      </>)}
    </div>
  );
}

const googleColors = {
  "calendar": {
    "1": {
      "background": "#ac725e",
      "foreground": "#1d1d1d"
    },
    "2": {
      "background": "#d06b64",
      "foreground": "#1d1d1d"
    },
    "3": {
      "background": "#f83a22",
      "foreground": "#1d1d1d"
    },
    "4": {
      "background": "#fa573c",
      "foreground": "#1d1d1d"
    },
    "5": {
      "background": "#ff7537",
      "foreground": "#1d1d1d"
    },
    "6": {
      "background": "#ffad46",
      "foreground": "#1d1d1d"
    },
    "7": {
      "background": "#42d692",
      "foreground": "#1d1d1d"
    },
    "8": {
      "background": "#16a765",
      "foreground": "#1d1d1d"
    },
    "9": {
      "background": "#7bd148",
      "foreground": "#1d1d1d"
    },
    "10": {
      "background": "#b3dc6c",
      "foreground": "#1d1d1d"
    },
    "11": {
      "background": "#fbe983",
      "foreground": "#1d1d1d"
    },
    "12": {
      "background": "#fad165",
      "foreground": "#1d1d1d"
    },
    "13": {
      "background": "#92e1c0",
      "foreground": "#1d1d1d"
    },
    "14": {
      "background": "#9fe1e7",
      "foreground": "#1d1d1d"
    },
    "15": {
      "background": "#9fc6e7",
      "foreground": "#1d1d1d"
    },
    "16": {
      "background": "#4986e7",
      "foreground": "#1d1d1d"
    },
    "17": {
      "background": "#9a9cff",
      "foreground": "#1d1d1d"
    },
    "18": {
      "background": "#b99aff",
      "foreground": "#1d1d1d"
    },
    "19": {
      "background": "#c2c2c2",
      "foreground": "#1d1d1d"
    },
    "20": {
      "background": "#cabdbf",
      "foreground": "#1d1d1d"
    },
    "21": {
      "background": "#cca6ac",
      "foreground": "#1d1d1d"
    },
    "22": {
      "background": "#f691b2",
      "foreground": "#1d1d1d"
    },
    "23": {
      "background": "#cd74e6",
      "foreground": "#1d1d1d"
    },
    "24": {
      "background": "#a47ae2",
      "foreground": "#1d1d1d"
    }
  },
  "event": {
    "1": {
      "background": "#a4bdfc",
      "foreground": "#1d1d1d"
    },
    "2": {
      "background": "#7ae7bf",
      "foreground": "#1d1d1d"
    },
    "3": {
      "background": "#dbadff",
      "foreground": "#1d1d1d"
    },
    "4": {
      "background": "#ff887c",
      "foreground": "#1d1d1d"
    },
    "5": {
      "background": "#fbd75b",
      "foreground": "#1d1d1d"
    },
    "6": {
      "background": "#ffb878",
      "foreground": "#1d1d1d"
    },
    "7": {
      "background": "#46d6db",
      "foreground": "#1d1d1d"
    },
    "8": {
      "background": "#e1e1e1",
      "foreground": "#1d1d1d"
    },
    "9": {
      "background": "#5484ed",
      "foreground": "#1d1d1d"
    },
    "10": {
      "background": "#51b749",
      "foreground": "#1d1d1d"
    },
    "11": {
      "background": "#dc2127",
      "foreground": "#1d1d1d"
    }
  }
};

const App = () => {

  const [timeZone] = useState('America/Argentina/Buenos_Aires');
  const [currentDate, setCurrentDate] = useState(moment().tz(timeZone));

  const [calendarType, setCalendarType] = useState(CalendarType.SPECIFIC);
  const [calendarView, setCalendarView] = useState(CalendarView.WEEK);
  const [editionMode, setEditionMode] = useState(EditionMode.EVENTS);

  const [events, setEvents] = useState(() => {
    const today = moment().tz(timeZone).startOf('days');
    const wednesday = today.clone().startOf('weeks').add(3, 'days');
    const thursday = today.clone().startOf('weeks').add(4, 'days');
    return [
      {
        start: moment('2020-11-23T04:30:00.000-03:00').toDate(),
        end: moment('2020-11-23T14:30:00.000-03:00').toDate(),
        summary: '24 con dani',
        borderColor: colorLuminance(googleColors["event"]["1"].background, -.2),
        bgColor: googleColors["event"]["1"].background,
        color: googleColors["event"]["1"].foreground
      },
      {
        start: wednesday.clone().add(11, 'hours').add(15, 'minutes').toDate(),
        end: wednesday.clone().add(12, 'hours').add(10, 'minutes').toDate(),
        summary: 'yesterday 11:15a to 12:10a',
        borderColor: colorLuminance(googleColors["event"]["2"].background, -.2),
        bgColor: googleColors["event"]["2"].background,
        color: googleColors["event"]["2"].foreground
      },
      {
        start: thursday.clone().add(3, 'hours').toDate(),
        end: thursday.clone().add(7, 'hours').toDate(),
        summary: 'meeting 3am to 7am',
        borderColor: colorLuminance(googleColors["event"]["3"].background, -.2),
        bgColor: googleColors["event"]["3"].background,
        color: googleColors["event"]["3"].foreground
      },
      {
        start: today.clone().add(10.5, 'hours').toDate(),
        end: today.clone().add(12, 'hours').toDate(),
        summary: 'meeting 10:30am to 12pm',
        borderColor: colorLuminance(googleColors["event"]["4"].background, -.2),
        bgColor: googleColors["event"]["4"].background,
        color: googleColors["event"]["4"].foreground
      },
      {
        start: wednesday.clone().add(15, 'hours').toDate(),
        end: wednesday.clone().add(24, 'hours').toDate(),
        summary: 'meeting 3pm to 12am',
        borderColor: colorLuminance(googleColors["event"]["5"].background, -.2),
        bgColor: googleColors["event"]["5"].background,
        color: googleColors["event"]["5"].foreground
      },
      {
        start: thursday.clone().toDate(),
        allDay: true,
        summary: 'Some holiday or all day event 1234 1234 1234 1234 1234 1234 ',
        borderColor: colorLuminance(googleColors["event"]["6"].background, -.2),
        bgColor: googleColors["event"]["6"].background,
        color: googleColors["event"]["6"].foreground
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
        events={events}
        onCreateEvent={handleCreateEvent} onChangeEvent={handleChangeEvent} onDeleteEvent={handleDeleteEvent}
        slots={slots}
        onCreateSlot={handleCreateSlot} onChangeSlot={handleChangeSlot} onDeleteSlot={handleDeleteSlot}
        weeklyRecurringSlots={weeklyRecurringSlots}
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
