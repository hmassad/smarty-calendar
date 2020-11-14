import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import moment from 'moment-timezone';

const weekDates = (date, timeZone) => {
  const _weekDates = [];
  const current = moment(date).tz(timeZone).startOf('weeks');
  for (let i = 0; i < 7; i++) {
    _weekDates.push(current.toDate());
    current.add(1, 'days');
  }
  return _weekDates;
}

const timesOfDay = () => {
  return [...Array(24)].map((v, i) => i);
}

const stopEventPropagation = e => {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

function App() {

  const eventsRef = useRef();
  const dragStartRef = useRef();

  const [currentDate/*, setCurrentDate*/] = useState(new Date());
  const [timeZone/*, setTimeZone*/] = useState('America/Argentina/Buenos_Aires');
  const [allDayEvents/*, setAllDayEvents*/] = useState([]);

  const [mousePosition, setMousePosition] = useState(null);

  const handleMouseMove = useCallback((e) => {
    if (!dragStartRef.current) return;
    
    // console.debug('handleMouseMove', e);
    // // const { offsetX, offsetY } = dragStartRef.current;
    // // console.debug({
    // //   left: `${e.pageX - offsetX}px`
    // //   top: `${e.pageY - offsetY}px`
    // // })'
    setMousePosition({x: e.pageX, y: e.pageY});

    return stopEventPropagation(e);
  }, []);

  const handleMouseDown = useCallback((e) => {
    const eventsRect = eventsRef.current.getBoundingClientRect();
    console.debug({eventsRect, e, pageX: e.pageX, clientY: e.clientY})

    // ignore event if outside events
    if (
      e.pageX < eventsRect.left + window.scrollX ||
      e.pageX > eventsRect.right + window.scrollX ||
      e.pageY < eventsRect.top + window.scrollY ||
      e.pageY > eventsRect.bottom + window.scrollY
    ) {
        console.debug('outside eventsRect');
        return;
    }

    console.debug({eventsRect})

    dragStartRef.current = ({
      documentX: e.pageX,
      documentY: e.pageY,
    });
    setMousePosition({x: e.pageX, y: e.pageY});

    document.addEventListener('mousemove', handleMouseMove, true);

    return stopEventPropagation(e);
  }, [handleMouseMove]);

  const handleMouseUp = useCallback((e) => {
    console.debug('handleMouseUp', e);

    document.removeEventListener('mousemove', handleMouseMove);

    dragStartRef.current = null;
    setMousePosition(null);

    return stopEventPropagation(e);
  }, [handleMouseMove]);

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  const startOfDay = moment(currentDate).tz(timeZone).startOf('days');
  const startOfWeek = startOfDay.clone().startOf('weeks');

  return (
    <div className="container">

      <div className='column'>
        <div className='header'>
          { mousePosition ? `${mousePosition.x}-${mousePosition.y}` : null}
        </div>

        { allDayEvents && allDayEvents.length ? <div className='all-day-events'/> : null }

        { timesOfDay().map((tod) => (
          <div key={tod} className='time-of-day'>
            <div className='indicator'>
              {`${startOfWeek.clone().add(tod, 'hours').format('ha')}`}
            </div>
          </div>
        ))}

        <div className='time-of-day'>
          <div className='indicator'>
            {`${startOfWeek.clone().add(24, 'hours').format('ha')}`}
          </div>
        </div>
      </div>

      {weekDates(currentDate, timeZone).map(date => {
        const isToday = startOfDay.isSame(moment(date).tz(timeZone), 'days');
        return (
          <div key={date.getTime()} className={`column ${isToday ? 'today': ''}`}>
            <div className='header'>
              {`${moment(date).tz(timeZone).format('dd D')}`}
            </div>

            { allDayEvents && allDayEvents.length ? (
              <div className='all-day-events'>
              </div>
            ) : null}

            <div className='events' ref={eventsRef}>
              {timesOfDay().map((tod) => (
                <div key={tod} className='time-of-day'>
                </div>
              ))}
            </div>
          </div>
        );
      })}

    { mousePosition && <div className={`now`} style={{left: mousePosition.x, top: mousePosition.y}} /> }
    </div>
  );
}

export default App;
