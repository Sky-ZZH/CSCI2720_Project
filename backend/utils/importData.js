import axios from 'axios';
import xml2js from 'xml2js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Location from '../models/Location.js';
import Event from '../models/Event.js';

// Environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Get XML data for government database URLs
const LCSD_API_URLS = {
  EVENTS: 'https://www.lcsd.gov.hk/datagovhk/event/events.xml',
  VENUES: 'https://www.lcsd.gov.hk/datagovhk/event/venues.xml',
  HOLIDAYS: 'https://www.lcsd.gov.hk/datagovhk/event/holiday.xml',
  EVENT_DATES: 'https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml'
};

// fetch and parse XML from a given URL
const fetchAndParseXML = async (url) => {
  try {
    console.log(`Fetching: ${url}`);
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    console.log(`Parsed successfully: ${url}`);
    return result;
  } catch (error) {
    console.error(`Fetch/parse failed (${url}):`, error.message);
    throw error;
  }
};

// count events per venue
const countEventsByVenue = (events) => {
  const venueEventCount = new Map();
  
  for (const evt of events) {
    const venueId = evt.venueid?.[0];
    if (venueId) {
      venueEventCount.set(venueId, (venueEventCount.get(venueId) || 0) + 1);
    }
  }
  return venueEventCount;
};

// build a map of venueId to venue details
const buildVenueMap = (venuesData) => {
  const venueMap = new Map();
  const venues = venuesData.venues.venue || [];
  
  for (const venue of venues) {
    const id = venue.$.id;
    const nameE = venue.venuee?.[0] || 'Unknown Venue';
    const latitude = venue.latitude?.[0];
    const longitude = venue.longitude?.[0];
    
    venueMap.set(id, {
      name: nameE,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    });
  }
  
  console.log(`Loaded ${venueMap.size} venues`);
  return venueMap;
};

// remove duplicate coordinates, keeping the venue with the most events
const removeDuplicateCoordinates = (venueIds, venueMap, venueEventCount) => {
  
  const coordGroups = new Map();
  for (const venueId of venueIds) {
    const venueInfo = venueMap.get(venueId);
    
    if (!venueInfo || !venueInfo.latitude || !venueInfo.longitude) {
      continue; 
    }
    const coordKey = `${venueInfo.latitude},${venueInfo.longitude}`;
    
    if (!coordGroups.has(coordKey)) {
      coordGroups.set(coordKey, []);
    }
    coordGroups.get(coordKey).push({
      venueId,
      name: venueInfo.name,
      eventCount: venueEventCount.get(venueId) || 0
    });
  }
  
  // for each coordinate group, keep only the venue with the most events
  const selectedVenues = [];
  const removedVenues = [];
  
  console.log('\n Processing duplicate coordinates...');
  
  for (const [coord, venues] of coordGroups) {
    if (venues.length === 1) {
      selectedVenues.push(venues[0].venueId);
    } else {
      venues.sort((a, b) => b.eventCount - a.eventCount);
      const winner = venues[0];
      const losers = venues.slice(1);
      selectedVenues.push(winner.venueId);
      console.log(`\nCoordinate ${coord} has ${venues.length} venues:`);
      console.log(`   Kept: ${winner.name} (${winner.venueId}) - ${winner.eventCount} events`);
      
      for (const loser of losers) {
        removedVenues.push(loser);
        console.log(`   Removed: ${loser.name} (${loser.venueId}) - ${loser.eventCount} events`);
      }
    }
  }
  
  if (removedVenues.length > 0) {
    console.log(`\nTotal removed ${removedVenues.length} venues with duplicate coordinates`);
  } else {
    console.log('\nNo duplicate coordinates found');
  }
  return selectedVenues;
};

// select top venues based on event count and remove duplicates
const selectTopVenues = (venueEventCount, venueMap, minEvents = 3, topCount = 10) => {
  const candidateVenues = Array.from(venueEventCount.entries())
    .filter(([id, count]) => {
      const venueInfo = venueMap.get(id);
      return count >= minEvents && 
             venueInfo && 
             venueInfo.latitude && 
             venueInfo.longitude;
    })
    .sort((a, b) => b[1] - a[1]) 
    .slice(0, topCount * 3)
    .map(([id]) => id);
  
  console.log(`\nSelected ${candidateVenues.length} candidate venues (min ${minEvents} events)`);
  
  // Handle duplicate coordinates, keep the one with the most events
  const finalVenues = removeDuplicateCoordinates(candidateVenues, venueMap, venueEventCount);
  
  // Limit to topCount
  const selectedVenues = finalVenues.slice(0, topCount);
  
  console.log(`\nFinal selection: ${selectedVenues.length} venues:`);
  selectedVenues.forEach((venueId, index) => {
    const venueInfo = venueMap.get(venueId);
    const eventCount = venueEventCount.get(venueId);
    console.log(`   ${index + 1}. ${venueInfo.name} (${venueId}) - ${eventCount} events`);
  });
  
  return selectedVenues;
};


// main import function
const importData = async () => {
  try {
    // A. connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_db'
    );
    console.log('Connected to MongoDB');

    // B. fetch events and venues data
    console.log('\nFetching data...\n');
    const [eventsData, venuesData] = await Promise.all([
      fetchAndParseXML(LCSD_API_URLS.EVENTS),
      fetchAndParseXML(LCSD_API_URLS.VENUES)
    ]);

    const events = eventsData.events.event;
    console.log(`\nFetched ${events.length} events`);

    // C. build venue map
    console.log('\nLoading venue information...');
    const venueMap = buildVenueMap(venuesData);

    // D. select top 10 venues (handles duplicates)
    console.log('\nCounting events per venue...');
    const venueEventCount = countEventsByVenue(events);
    const selectedVenueIds = selectTopVenues(venueEventCount, venueMap, 3, 10);

    // E. clear old data
    console.log('\nClearing old data...');
    await Location.deleteMany({});
    await Event.deleteMany({});
    console.log('   Old data deleted');

    // F. create Location documents
    console.log('\nCreating venue documents...');
    const locationDocMap = new Map();

    for (const venueId of selectedVenueIds) {
      const venueInfo = venueMap.get(venueId);

      try {
        const newLoc = await Location.create({
          id: venueId,
          name: venueInfo.name,
          latitude: venueInfo.latitude,
          longitude: venueInfo.longitude,
          events: []
        });
        locationDocMap.set(venueId, newLoc);
        console.log(`   Created: ${venueInfo.name}`);
      } catch (error) {
        console.error(`   Creation failed ${venueInfo.name}:`, error.message);
      }
    }

    console.log(`\nCreated ${locationDocMap.size} venues`);

    // G. import events
    console.log('\nImporting events...');
    let importedCount = 0;
    let skippedCount = 0;

    for (const evt of events) {
      const venueId = evt.venueid?.[0];

      // Only process events for selected venues
      if (!locationDocMap.has(venueId)) {
        skippedCount++;
        continue;
      }

      const locationDoc = locationDocMap.get(venueId);

      const title = evt.titlee?.[0] || 'No Title';
      const dateTime = evt.predateE?.[0] || 'TBA';
      
      let description = evt.desce?.[0];
      if (!description || typeof description !== 'string') {
        description = 'No description available.';
      }
      description = description.trim();

      const presenter = evt.presenterorge?.[0] || 'Unknown Presenter';
      const price = evt.pricee?.[0] || 'Free';

      try {
        const newEvent = await Event.create({
          title: title,
          venue: locationDoc._id,
          dateTime: dateTime,
          description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
          presenter: presenter,
          price: price
        });

        locationDoc.events.push(newEvent._id);
        await locationDoc.save();

        importedCount++;
      } catch (error) {
        console.error(`   Event import failed (${title}):`, error.message);
      }
    }

    // H. output summary
    console.log('\n' + '='.repeat(60));
    console.log('Import Completed');
    console.log('='.repeat(60));
    console.log(`Venues created: ${locationDocMap.size}`);
    console.log(`Events imported: ${importedCount}`);
    console.log(`Events skipped: ${skippedCount} (not in selected venues)`);
    console.log(`Updated at: ${new Date().toLocaleString('en-HK')}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\nError during import:');
    console.error(error);
    process.exit(1);
  }
};

// Execute import
importData();
