const NameOpenSpaceCD = require('./commands/NameOpenSpaceCD');

const OpenSpaceNamedEvent = require('./events/OpenSpaceNamedEvent');
const DateRangeSetEvent = require('./events/DateRangeSetEvent');
const TopicSubmittedEvent = require('./events/TopicSubmittedEvent');

if (process.argv.includes('--run-tests')) {
  run_tests();
  process.exit(0);
}

const port = 3000;
const fs = require('fs');
const express = require('express');
const app = express();
const { engine } = require('express-handlebars');
const { v4: uuidv4 } = require('uuid');
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.engine('handlebars', engine({ defaultLayout: false }));
app.set('view engine', 'handlebars');
app.set('views', './views');
app.listen(port, () => { console.log(`Example app listening at http://localhost:${port}`); });

const EVENT_STORE_PATH = __dirname + '/eventstore/';
function getAllEventFileNames(filterFunction) { return fs.readdirSync(EVENT_STORE_PATH).filter(filterFunction)};
function writeEventIfIdNotExists(event) { if (fs.readdirSync(EVENT_STORE_PATH).filter(file => file.includes(event.id)).length === 0) { fs.writeFileSync(`${EVENT_STORE_PATH}${event.timestamp.replace(/:/g, '-').replace(/\..+/, '')}-${event.id}-${event.type}.json`, JSON.stringify(event)); } }
function getLastEvent(eventType) { try { return JSON.parse(fs.readFileSync(EVENT_STORE_PATH + getAllEventFileNames(file => file.includes(eventType)).sort().reverse()[0], 'utf8'));
} catch (err) { return null; } }
function getAllEvents() { return fs.readdirSync(EVENT_STORE_PATH).map(file => JSON.parse(fs.readFileSync(EVENT_STORE_PATH + file, 'utf8'))); }


app.get('/', (req, res) => { res.redirect('/create_space'); });

app.get('/create_space', (req, res) => { res.render('create_space', { spaceName: OpenSpaceNameSV(getAllEvents()).spaceName, id: uuidv4() }); });
app.post('/create_space', (req, res) => {
  const {spaceName, id} = req.body;
  const result = handleNameOpenSpaceCD(getAllEvents(), new NameOpenSpaceCD(spaceName, id, new Date().toISOString()));
  if (result.Error) { res.status(400).send(result.Error); return; }
  try { writeEventIfIdNotExists(result.Events[0]);
    res.redirect('/space_created_confirmation');
  } catch (err) { res.status(500).send('Failed to write event to the file system' + JSON.stringify(err)); }
});
app.get(/space_created_confirmation/, (req, res) => { res.render('space_created_confirmation', OpenSpaceNameSV(getAllEvents())); });
function handleNameOpenSpaceCD(eventsArray, command) {
  if (command.spaceName.trim() === "") { return { Error: "Space name is required", Events: [] }; }
  const lastEvent = eventsArray.filter(event => event.type === 'OpenSpaceNamedEvent').sort((a, b) => a.timestamp - b.timestamp).reverse()[0];
  if (lastEvent && lastEvent.spaceName.trim() === command.spaceName.trim()) { return { Error: "Space name already exists", Events: [] }; }
  return { Error: "", Events: [new OpenSpaceNamedEvent(command.spaceName, command.timeStamp, command.id)] };
}
function OpenSpaceNameSV(eventsArray) {
  const lastEvent = eventsArray.filter(event => event.type === 'OpenSpaceNamedEvent').sort((a, b) => a.timestamp - b.timestamp).reverse()[0];
  return lastEvent ? { spaceName: lastEvent.spaceName, errorMessage: ''} : { errorMessage: 'No space has been created yet.', spaceName: ''};
}

app.get('/set_dates', (req, res) => { res.render('set_dates', { eventName: OpenSpaceNameSV(getAllEvents()).spaceName, id: uuidv4() }); });
app.post('/set_dates', (req, res) => {
  const { startDate, endDate, id } = req.body;
  const dateRangeSetEvent = new DateRangeSetEvent(startDate, endDate, new Date().toISOString(), id);
  try { writeEventIfIdNotExists(dateRangeSetEvent); 
    res.redirect('/set_dates_confirmation');
  } catch (err) { res.status(500).send('Failed to write date range event to the file system'); return; }
});
app.get('/set_dates_confirmation', (req, res) => { res.render('set_dates_confirmation', OpenSpaceDateRangeSV(getAllEvents())); });
function OpenSpaceDateRangeSV(events) {
  const lastEvent = events.filter(event => event.type === 'DateRangeSetEvent').sort((a, b) => a.timestamp - b.timestamp).reverse()[0];
  return lastEvent ? { errorMessage: '', startDate: lastEvent.startDate, endDate: lastEvent.endDate } : { errorMessage: 'Date range not set yet.', startDate: '', endDate: '' };
}

app.get('/submit_topic', (req, res) => { res.render('submit_topic', { eventName: OpenSpaceNameSV(getAllEvents()).spaceName, id: uuidv4() }); });
app.post('/submit_topic', (req, res) => {
    const { name, type, topic, id } = req.body;
    const topicSubmittedEvent = new TopicSubmittedEvent(name, type, topic, new Date().toISOString(), id);
    try {
        writeEventIfIdNotExists(topicSubmittedEvent);
        res.redirect('/sessions');
    } catch (err) { res.status(500).send('Failed to write event to the file system'); }
});
app.get('/sessions', (req, res) => { res.render('sessions', { sessions: SessionsSV(getAllEvents()) }); });
function SessionsSV(events) {
    return events.filter(event => event.type === 'TopicSubmittedEvent').sort((a, b) => a.timestamp - b.timestamp);
}

function run_tests() {
  function logResult(expected, result) { 
    console.log(`Expected: ${expected}, Got: ${result}`);
  }
  function assertObjectEqual(expected, actual) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error(`Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  const commandTimeStamp = new Date("2024-05-21T00:00:00.000Z").toISOString();
  const commandUUID = "fceee960-2f9f-47b0-ad19-fed15d4f82cb";
  const testEvents = [
    new OpenSpaceNamedEvent("EM Open spaces", commandTimeStamp, commandUUID),
    new OpenSpaceNamedEvent("Event Modeling Space", "2024-05-22T00:00:00.000Z", "2ceee960-2f9f-47b0-ad19-fed15d4f82cb"),
    new OpenSpaceNamedEvent("Event Modeling Open Spaces", "2024-05-23T00:00:00.000Z", "3ceee960-2f9f-47b0-ad19-fed15d4f82cb"),
    new DateRangeSetEvent("2024-06-06", "2024-06-07", "2024-05-24T00:00:00.000Z", "4ceee960-2f9f-47b0-ad19-fed15d4f82cb"),
  ]
  const slices = [
    {
      name: "NameOpneSpaceCD",
      tests: [
        {
          name: "NameOpenSpaceCD can't have a blank name",
          test: () => {
            const result = handleNameOpenSpaceCD(testEvents, new NameOpenSpaceCD(" ", commandUUID, commandTimeStamp));
            assertObjectEqual(result.Error, "Space name is required");
            assertObjectEqual(result.Events, []);
            return true;
          }
        },
        {
          name: "NameOpenSpaceCD should be valid with no prior events",
          test: () => {
            const expected = new OpenSpaceNamedEvent("EM Open spaces", commandTimeStamp, commandUUID);
            const result = handleNameOpenSpaceCD(testEvents, new NameOpenSpaceCD(expected.spaceName, commandUUID, commandTimeStamp));
            assertObjectEqual(result.Error, "");
            assertObjectEqual(expected, result.Events[0]);
            return true;
          }
        },
        {
          name: "NameOpenSpaceCD should not match the last name set event even if extra whitespace is present",
          test: () => {
            const result = handleNameOpenSpaceCD(testEvents, new NameOpenSpaceCD("Event Modeling Open Spaces ", commandUUID, commandTimeStamp));
            assertObjectEqual(result.Error, "Space name already exists");
            assertObjectEqual(result.Events, []);
            return true;
          }
        }
      ]
    },
    { 
      name: "OpenSpaceNameSV",
      tests: [
        {
          name: 'OpenSpaceNameSV with no OpenSpaceNamedEvent events',
          test: () => {
            const expected = { errorMessage: 'No space has been created yet.', spaceName: '' };
            const result = OpenSpaceNameSV(testEvents.slice(0, 0));
            assertObjectEqual(expected, result);
            return true;
          }
        },
        {
          name: 'OpenSpaceNameSV with only one OpenSpaceNamedEvent event',
          test: () => {
            const expected = { spaceName: 'EM Open spaces', errorMessage: '' };
            const result = OpenSpaceNameSV(testEvents.slice(0, 1));
            assertObjectEqual(expected, result);
            return true;
          }
        },
        {
          name: 'OpenSpaceNameSV with two OpenSpaceNamedEvent events; last one should always win',
          test: () => {
            const expected = { spaceName: 'Event Modeling Space', errorMessage: '' };
            const result = OpenSpaceNameSV(testEvents.slice(0, 2));
            assertObjectEqual(expected, result);
            return true;
          }
        },
        {
          name: 'OpenSpaceNameSV with three OpenSpaceNamedEvent events; last one should always win',
          test: () => {
            const expected = { spaceName: 'Event Modeling Open Spaces', errorMessage: '' };
            const result = OpenSpaceNameSV(testEvents.slice(0, 3));
            assertObjectEqual(expected, result);
            return true;
          }
        },
        ,
        {
          name: 'OpenSpaceNameSV with inconsequential DateRangeSetEvent event, it should be ignored and last OpenSpaceNamedEvent should be used',
          test: () => {
            const expected = { spaceName: 'Event Modeling Open Spaces', errorMessage: '' };
            const result = OpenSpaceNameSV(testEvents.slice(0, 4));
            assertObjectEqual(expected, result);
            return true;
          }
        }
      ]
    }
  ]

  slices.forEach(slice => {
    console.log(`\x1b[42;97m\x1b[1m${slice.name} slice tests:\x1b[0m`);
    slice.tests.forEach(test => {
      try { console.log("Test " + (test.test() ? '✅ ' : '❌ ') + test.name);
      } catch (error) { console.log('❌ ' + test.name + ' had error: ' + error); }
    });
  });
}
module.exports = app;
