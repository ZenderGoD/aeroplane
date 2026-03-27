/**
 * ATC Frequency Database for Major World Airports
 *
 * Realistic ATC frequencies for the top 50 busiest airports worldwide.
 * Frequency data sourced from publicly available airport information.
 */

export interface ATCFrequency {
  type: "ATIS" | "GND" | "TWR" | "DEP" | "APP" | "CTR" | "UNICOM";
  name: string;
  frequency: string;
}

export interface AirportFrequencies {
  icao: string;
  name: string;
  frequencies: ATCFrequency[];
}

export const ATC_FREQUENCIES: AirportFrequencies[] = [
  // ──────────────────── United States ────────────────────
  {
    icao: "KATL",
    name: "Hartsfield-Jackson Atlanta Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "125.550" },
      { type: "GND", name: "Ground South", frequency: "121.900" },
      { type: "GND", name: "Ground North", frequency: "121.750" },
      { type: "TWR", name: "Tower South", frequency: "119.100" },
      { type: "TWR", name: "Tower North", frequency: "119.500" },
      { type: "DEP", name: "Departure South", frequency: "125.000" },
      { type: "DEP", name: "Departure North", frequency: "132.350" },
      { type: "APP", name: "Approach South", frequency: "127.900" },
      { type: "APP", name: "Approach North", frequency: "119.800" },
      { type: "CTR", name: "Atlanta Center", frequency: "132.750" },
    ],
  },
  {
    icao: "KLAX",
    name: "Los Angeles Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS North", frequency: "133.800" },
      { type: "ATIS", name: "ATIS South", frequency: "128.950" },
      { type: "GND", name: "Ground North", frequency: "121.650" },
      { type: "GND", name: "Ground South", frequency: "121.750" },
      { type: "TWR", name: "Tower North", frequency: "133.900" },
      { type: "TWR", name: "Tower South", frequency: "120.950" },
      { type: "DEP", name: "Departure", frequency: "124.300" },
      { type: "APP", name: "Approach", frequency: "124.500" },
      { type: "APP", name: "Approach East", frequency: "125.200" },
      { type: "CTR", name: "SoCal Center", frequency: "134.200" },
    ],
  },
  {
    icao: "KJFK",
    name: "John F Kennedy Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.725" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "GND", name: "Ground Metering", frequency: "121.650" },
      { type: "TWR", name: "Tower", frequency: "119.100" },
      { type: "TWR", name: "Tower 31L", frequency: "123.900" },
      { type: "DEP", name: "Departure", frequency: "135.900" },
      { type: "APP", name: "Approach", frequency: "132.400" },
      { type: "APP", name: "Approach Final", frequency: "128.550" },
      { type: "CTR", name: "New York Center", frequency: "128.750" },
    ],
  },
  {
    icao: "KORD",
    name: "Chicago O'Hare Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS Arrival", frequency: "135.400" },
      { type: "ATIS", name: "ATIS Departure", frequency: "132.750" },
      { type: "GND", name: "Ground Inbound", frequency: "121.750" },
      { type: "GND", name: "Ground Outbound", frequency: "121.900" },
      { type: "TWR", name: "Tower Local East", frequency: "126.900" },
      { type: "TWR", name: "Tower Local West", frequency: "132.700" },
      { type: "DEP", name: "Departure", frequency: "125.400" },
      { type: "APP", name: "Approach", frequency: "124.350" },
      { type: "CTR", name: "Chicago Center", frequency: "133.950" },
    ],
  },
  {
    icao: "KDFW",
    name: "Dallas/Fort Worth Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS East", frequency: "134.900" },
      { type: "ATIS", name: "ATIS West", frequency: "135.150" },
      { type: "GND", name: "Ground East", frequency: "121.650" },
      { type: "GND", name: "Ground West", frequency: "121.800" },
      { type: "TWR", name: "Tower East", frequency: "126.550" },
      { type: "TWR", name: "Tower West", frequency: "124.150" },
      { type: "DEP", name: "Departure", frequency: "135.050" },
      { type: "APP", name: "Approach North", frequency: "124.150" },
      { type: "APP", name: "Approach South", frequency: "119.050" },
      { type: "CTR", name: "Fort Worth Center", frequency: "132.850" },
    ],
  },
  {
    icao: "KDEN",
    name: "Denver Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "132.350" },
      { type: "GND", name: "Ground South", frequency: "121.850" },
      { type: "GND", name: "Ground North", frequency: "121.900" },
      { type: "TWR", name: "Tower South", frequency: "118.300" },
      { type: "TWR", name: "Tower North", frequency: "134.825" },
      { type: "DEP", name: "Departure", frequency: "128.250" },
      { type: "APP", name: "Approach", frequency: "120.850" },
      { type: "CTR", name: "Denver Center", frequency: "127.850" },
    ],
  },
  {
    icao: "KSFO",
    name: "San Francisco Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "118.850" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower", frequency: "120.500" },
      { type: "DEP", name: "Departure", frequency: "120.900" },
      { type: "APP", name: "NorCal Approach", frequency: "135.650" },
      { type: "CTR", name: "Oakland Center", frequency: "127.850" },
    ],
  },
  {
    icao: "KLAS",
    name: "Harry Reid Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "132.400" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "119.900" },
      { type: "DEP", name: "Departure", frequency: "125.900" },
      { type: "APP", name: "Approach", frequency: "125.600" },
      { type: "CTR", name: "LA Center", frequency: "132.300" },
    ],
  },
  {
    icao: "KPHX",
    name: "Phoenix Sky Harbor Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.575" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "118.700" },
      { type: "DEP", name: "Departure", frequency: "120.700" },
      { type: "APP", name: "Approach", frequency: "119.200" },
      { type: "CTR", name: "Albuquerque Center", frequency: "132.150" },
    ],
  },
  {
    icao: "KMIA",
    name: "Miami Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "132.000" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower North", frequency: "118.300" },
      { type: "TWR", name: "Tower South", frequency: "123.900" },
      { type: "DEP", name: "Departure", frequency: "128.100" },
      { type: "APP", name: "Approach North", frequency: "124.850" },
      { type: "APP", name: "Approach South", frequency: "119.000" },
      { type: "CTR", name: "Miami Center", frequency: "132.450" },
    ],
  },
  {
    icao: "KEWR",
    name: "Newark Liberty Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "115.100" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower", frequency: "118.300" },
      { type: "DEP", name: "Departure", frequency: "119.200" },
      { type: "APP", name: "Approach", frequency: "127.850" },
      { type: "CTR", name: "New York Center", frequency: "128.750" },
    ],
  },
  {
    icao: "KMSP",
    name: "Minneapolis-St Paul Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "135.350" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "126.700" },
      { type: "DEP", name: "Departure", frequency: "135.350" },
      { type: "APP", name: "Approach", frequency: "119.300" },
      { type: "CTR", name: "Minneapolis Center", frequency: "132.450" },
    ],
  },
  {
    icao: "KSEA",
    name: "Seattle-Tacoma Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "118.000" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "119.900" },
      { type: "DEP", name: "Departure", frequency: "120.400" },
      { type: "APP", name: "Approach", frequency: "124.200" },
      { type: "CTR", name: "Seattle Center", frequency: "128.050" },
    ],
  },
  {
    icao: "KDTW",
    name: "Detroit Metropolitan Wayne County",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "135.000" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower", frequency: "135.000" },
      { type: "DEP", name: "Departure", frequency: "118.400" },
      { type: "APP", name: "Approach", frequency: "124.350" },
      { type: "CTR", name: "Cleveland Center", frequency: "132.850" },
    ],
  },
  {
    icao: "KBOS",
    name: "Boston Logan Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "135.000" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "128.800" },
      { type: "DEP", name: "Departure", frequency: "133.000" },
      { type: "APP", name: "Approach", frequency: "120.600" },
      { type: "CTR", name: "Boston Center", frequency: "128.750" },
    ],
  },

  // ──────────────────── Europe ────────────────────
  {
    icao: "EGLL",
    name: "London Heathrow",
    frequencies: [
      { type: "ATIS", name: "ATIS Arrival", frequency: "115.100" },
      { type: "ATIS", name: "ATIS Departure", frequency: "121.850" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "GND", name: "Ground Delivery", frequency: "121.975" },
      { type: "TWR", name: "Tower North", frequency: "118.500" },
      { type: "TWR", name: "Tower South", frequency: "118.700" },
      { type: "DEP", name: "Departure", frequency: "118.825" },
      { type: "APP", name: "Approach Director", frequency: "119.725" },
      { type: "APP", name: "Approach Final", frequency: "109.500" },
      { type: "CTR", name: "London Control", frequency: "127.100" },
    ],
  },
  {
    icao: "EGKK",
    name: "London Gatwick",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "136.525" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower", frequency: "124.225" },
      { type: "DEP", name: "Departure", frequency: "126.825" },
      { type: "APP", name: "Approach", frequency: "126.825" },
      { type: "CTR", name: "London Control", frequency: "129.425" },
    ],
  },
  {
    icao: "LFPG",
    name: "Paris Charles de Gaulle",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.250" },
      { type: "GND", name: "Ground North", frequency: "121.600" },
      { type: "GND", name: "Ground South", frequency: "121.800" },
      { type: "TWR", name: "Tower North", frequency: "119.250" },
      { type: "TWR", name: "Tower South", frequency: "120.900" },
      { type: "DEP", name: "Departure", frequency: "126.650" },
      { type: "APP", name: "Approach North", frequency: "121.150" },
      { type: "APP", name: "Approach South", frequency: "125.825" },
      { type: "CTR", name: "Paris Control", frequency: "131.275" },
    ],
  },
  {
    icao: "EHAM",
    name: "Amsterdam Schiphol",
    frequencies: [
      { type: "ATIS", name: "ATIS Arrival", frequency: "132.975" },
      { type: "ATIS", name: "ATIS Departure", frequency: "130.125" },
      { type: "GND", name: "Ground Platform", frequency: "121.800" },
      { type: "GND", name: "Ground Delivery", frequency: "121.700" },
      { type: "TWR", name: "Tower 1", frequency: "118.100" },
      { type: "TWR", name: "Tower 2", frequency: "119.225" },
      { type: "DEP", name: "Departure", frequency: "119.050" },
      { type: "APP", name: "Schiphol Approach", frequency: "121.200" },
      { type: "CTR", name: "Amsterdam Radar", frequency: "125.750" },
    ],
  },
  {
    icao: "EDDF",
    name: "Frankfurt am Main",
    frequencies: [
      { type: "ATIS", name: "ATIS Arrival", frequency: "118.025" },
      { type: "ATIS", name: "ATIS Departure", frequency: "118.725" },
      { type: "GND", name: "Ground West", frequency: "121.650" },
      { type: "GND", name: "Ground East", frequency: "121.850" },
      { type: "TWR", name: "Tower", frequency: "119.900" },
      { type: "DEP", name: "Departure", frequency: "120.150" },
      { type: "APP", name: "Approach Director", frequency: "120.800" },
      { type: "APP", name: "Approach Radar", frequency: "127.275" },
      { type: "CTR", name: "Langen Radar", frequency: "128.500" },
    ],
  },
  {
    icao: "EDDM",
    name: "Munich Franz Josef Strauss",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "123.125" },
      { type: "GND", name: "Ground", frequency: "121.725" },
      { type: "TWR", name: "Tower", frequency: "118.700" },
      { type: "DEP", name: "Departure", frequency: "120.775" },
      { type: "APP", name: "Approach", frequency: "119.700" },
      { type: "CTR", name: "Munich Radar", frequency: "128.025" },
    ],
  },
  {
    icao: "LEMD",
    name: "Madrid Barajas Adolfo Suarez",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "118.250" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower North", frequency: "118.150" },
      { type: "TWR", name: "Tower South", frequency: "119.400" },
      { type: "DEP", name: "Departure", frequency: "129.575" },
      { type: "APP", name: "Approach", frequency: "119.050" },
      { type: "CTR", name: "Madrid Control", frequency: "132.150" },
    ],
  },
  {
    icao: "LEBL",
    name: "Barcelona El Prat",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "118.650" },
      { type: "GND", name: "Ground", frequency: "121.650" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "121.150" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Barcelona Control", frequency: "132.325" },
    ],
  },
  {
    icao: "LIRF",
    name: "Rome Fiumicino",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "121.250" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "118.700" },
      { type: "DEP", name: "Departure", frequency: "119.200" },
      { type: "APP", name: "Approach", frequency: "119.050" },
      { type: "CTR", name: "Rome Control", frequency: "128.800" },
    ],
  },
  {
    icao: "LTFM",
    name: "Istanbul Airport",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.200" },
      { type: "GND", name: "Ground West", frequency: "121.625" },
      { type: "GND", name: "Ground East", frequency: "121.850" },
      { type: "TWR", name: "Tower West", frequency: "118.100" },
      { type: "TWR", name: "Tower East", frequency: "118.500" },
      { type: "DEP", name: "Departure", frequency: "120.500" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Istanbul Control", frequency: "132.600" },
    ],
  },
  {
    icao: "UUEE",
    name: "Moscow Sheremetyevo",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.000" },
      { type: "GND", name: "Ground", frequency: "121.600" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "125.000" },
      { type: "APP", name: "Approach", frequency: "119.800" },
      { type: "CTR", name: "Moscow Control", frequency: "132.175" },
    ],
  },

  // ──────────────────── Middle East ────────────────────
  {
    icao: "OMDB",
    name: "Dubai Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.175" },
      { type: "GND", name: "Ground North", frequency: "118.350" },
      { type: "GND", name: "Ground South", frequency: "121.750" },
      { type: "TWR", name: "Tower", frequency: "118.750" },
      { type: "DEP", name: "Departure", frequency: "119.400" },
      { type: "APP", name: "Approach", frequency: "124.900" },
      { type: "CTR", name: "Emirates Radar", frequency: "132.150" },
    ],
  },
  {
    icao: "OEJN",
    name: "Jeddah King Abdulaziz Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.500" },
      { type: "GND", name: "Ground", frequency: "121.600" },
      { type: "TWR", name: "Tower", frequency: "118.200" },
      { type: "DEP", name: "Departure", frequency: "124.000" },
      { type: "APP", name: "Approach", frequency: "119.700" },
      { type: "CTR", name: "Jeddah Control", frequency: "132.000" },
    ],
  },
  {
    icao: "OTHH",
    name: "Doha Hamad Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "132.850" },
      { type: "GND", name: "Ground", frequency: "121.875" },
      { type: "TWR", name: "Tower East", frequency: "118.900" },
      { type: "TWR", name: "Tower West", frequency: "118.525" },
      { type: "DEP", name: "Departure", frequency: "124.775" },
      { type: "APP", name: "Approach", frequency: "119.425" },
      { type: "CTR", name: "Doha Radar", frequency: "132.350" },
    ],
  },
  {
    icao: "OBBI",
    name: "Bahrain Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.500" },
      { type: "GND", name: "Ground", frequency: "121.850" },
      { type: "TWR", name: "Tower", frequency: "118.000" },
      { type: "DEP", name: "Departure", frequency: "124.000" },
      { type: "APP", name: "Approach", frequency: "127.800" },
      { type: "CTR", name: "Bahrain Control", frequency: "132.750" },
    ],
  },

  // ──────────────────── Asia-Pacific ────────────────────
  {
    icao: "VHHH",
    name: "Hong Kong Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.200" },
      { type: "GND", name: "Ground", frequency: "121.600" },
      { type: "TWR", name: "Tower North", frequency: "118.400" },
      { type: "TWR", name: "Tower South", frequency: "118.200" },
      { type: "DEP", name: "Departure East", frequency: "123.800" },
      { type: "DEP", name: "Departure West", frequency: "124.350" },
      { type: "APP", name: "Approach East", frequency: "119.100" },
      { type: "APP", name: "Approach West", frequency: "119.350" },
      { type: "CTR", name: "Hong Kong Radar", frequency: "132.150" },
    ],
  },
  {
    icao: "RJTT",
    name: "Tokyo Haneda",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.800" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "TWR", name: "Tower South", frequency: "118.800" },
      { type: "DEP", name: "Departure", frequency: "126.000" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Tokyo Control", frequency: "132.100" },
    ],
  },
  {
    icao: "RJAA",
    name: "Tokyo Narita",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.250" },
      { type: "GND", name: "Ground", frequency: "121.850" },
      { type: "TWR", name: "Tower A", frequency: "118.350" },
      { type: "TWR", name: "Tower B", frequency: "122.700" },
      { type: "DEP", name: "Departure", frequency: "127.700" },
      { type: "APP", name: "Approach", frequency: "119.600" },
      { type: "CTR", name: "Tokyo Control", frequency: "132.100" },
    ],
  },
  {
    icao: "RKSI",
    name: "Seoul Incheon Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.250" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower North", frequency: "118.100" },
      { type: "TWR", name: "Tower South", frequency: "118.600" },
      { type: "DEP", name: "Departure", frequency: "126.600" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Incheon Control", frequency: "132.500" },
    ],
  },
  {
    icao: "WSSS",
    name: "Singapore Changi",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.400" },
      { type: "GND", name: "Ground East", frequency: "121.800" },
      { type: "GND", name: "Ground West", frequency: "121.650" },
      { type: "TWR", name: "Tower", frequency: "118.600" },
      { type: "DEP", name: "Departure", frequency: "125.200" },
      { type: "APP", name: "Approach", frequency: "119.200" },
      { type: "CTR", name: "Singapore Control", frequency: "132.600" },
    ],
  },
  {
    icao: "VTBS",
    name: "Bangkok Suvarnabhumi",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.500" },
      { type: "GND", name: "Ground East", frequency: "121.900" },
      { type: "GND", name: "Ground West", frequency: "121.700" },
      { type: "TWR", name: "Tower East", frequency: "118.100" },
      { type: "TWR", name: "Tower West", frequency: "119.100" },
      { type: "DEP", name: "Departure", frequency: "125.500" },
      { type: "APP", name: "Approach", frequency: "119.500" },
      { type: "CTR", name: "Bangkok Control", frequency: "132.150" },
    ],
  },
  {
    icao: "WMKK",
    name: "Kuala Lumpur Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.800" },
      { type: "GND", name: "Ground", frequency: "121.800" },
      { type: "TWR", name: "Tower", frequency: "118.500" },
      { type: "DEP", name: "Departure", frequency: "125.200" },
      { type: "APP", name: "Approach", frequency: "119.500" },
      { type: "CTR", name: "Lumpur Control", frequency: "132.600" },
    ],
  },
  {
    icao: "VIDP",
    name: "Indira Gandhi Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.400" },
      { type: "GND", name: "Ground East", frequency: "121.900" },
      { type: "GND", name: "Ground West", frequency: "121.650" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "TWR", name: "Tower South", frequency: "118.750" },
      { type: "DEP", name: "Departure", frequency: "124.350" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "APP", name: "Approach South", frequency: "127.300" },
      { type: "CTR", name: "Delhi Control", frequency: "132.500" },
    ],
  },
  {
    icao: "VABB",
    name: "Mumbai Chhatrapati Shivaji Maharaj Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.950" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "124.250" },
      { type: "APP", name: "Approach", frequency: "119.350" },
      { type: "CTR", name: "Mumbai Control", frequency: "132.300" },
    ],
  },
  {
    icao: "ZBAD",
    name: "Beijing Daxing Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.600" },
      { type: "GND", name: "Ground", frequency: "121.750" },
      { type: "TWR", name: "Tower East", frequency: "118.050" },
      { type: "TWR", name: "Tower West", frequency: "118.250" },
      { type: "DEP", name: "Departure", frequency: "125.900" },
      { type: "APP", name: "Approach", frequency: "119.400" },
      { type: "CTR", name: "Beijing Control", frequency: "132.400" },
    ],
  },
  {
    icao: "ZSPD",
    name: "Shanghai Pudong Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.850" },
      { type: "GND", name: "Ground", frequency: "121.600" },
      { type: "TWR", name: "Tower East", frequency: "118.100" },
      { type: "TWR", name: "Tower West", frequency: "118.350" },
      { type: "DEP", name: "Departure", frequency: "125.200" },
      { type: "APP", name: "Approach", frequency: "119.000" },
      { type: "CTR", name: "Shanghai Control", frequency: "132.600" },
    ],
  },
  {
    icao: "ZGGG",
    name: "Guangzhou Baiyun Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.400" },
      { type: "GND", name: "Ground", frequency: "121.850" },
      { type: "TWR", name: "Tower East", frequency: "118.100" },
      { type: "TWR", name: "Tower West", frequency: "118.500" },
      { type: "DEP", name: "Departure", frequency: "125.000" },
      { type: "APP", name: "Approach", frequency: "119.400" },
      { type: "CTR", name: "Guangzhou Control", frequency: "132.250" },
    ],
  },

  // ──────────────────── Oceania ────────────────────
  {
    icao: "YSSY",
    name: "Sydney Kingsford Smith",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.250" },
      { type: "GND", name: "Ground East", frequency: "121.700" },
      { type: "GND", name: "Ground West", frequency: "126.500" },
      { type: "TWR", name: "Tower", frequency: "120.500" },
      { type: "DEP", name: "Departures", frequency: "129.700" },
      { type: "APP", name: "Approach", frequency: "124.400" },
      { type: "CTR", name: "Sydney Centre", frequency: "130.300" },
    ],
  },
  {
    icao: "YMML",
    name: "Melbourne Tullamarine",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "132.000" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "120.500" },
      { type: "DEP", name: "Departures", frequency: "129.400" },
      { type: "APP", name: "Approach", frequency: "132.000" },
      { type: "CTR", name: "Melbourne Centre", frequency: "134.300" },
    ],
  },

  // ──────────────────── Americas (non-US) ────────────────────
  {
    icao: "CYYZ",
    name: "Toronto Pearson Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS Arrival", frequency: "120.825" },
      { type: "ATIS", name: "ATIS Departure", frequency: "133.300" },
      { type: "GND", name: "Ground", frequency: "121.650" },
      { type: "TWR", name: "Tower Infield", frequency: "118.700" },
      { type: "TWR", name: "Tower South", frequency: "119.500" },
      { type: "DEP", name: "Departure", frequency: "128.400" },
      { type: "APP", name: "Terminal", frequency: "119.350" },
      { type: "CTR", name: "Toronto Centre", frequency: "132.400" },
    ],
  },
  {
    icao: "MMMX",
    name: "Mexico City Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "118.700" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "119.900" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Mexico Control", frequency: "132.550" },
    ],
  },
  {
    icao: "SBGR",
    name: "Sao Paulo Guarulhos Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.750" },
      { type: "GND", name: "Ground", frequency: "121.650" },
      { type: "TWR", name: "Tower", frequency: "118.000" },
      { type: "DEP", name: "Departure", frequency: "125.350" },
      { type: "APP", name: "Approach", frequency: "119.000" },
      { type: "CTR", name: "Curitiba Control", frequency: "132.100" },
    ],
  },
  {
    icao: "SCEL",
    name: "Santiago Arturo Merino Benitez Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "128.400" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "125.100" },
      { type: "APP", name: "Approach", frequency: "119.300" },
      { type: "CTR", name: "Santiago Control", frequency: "132.800" },
    ],
  },

  // ──────────────────── Africa ────────────────────
  {
    icao: "FAOR",
    name: "Johannesburg O.R. Tambo Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "127.400" },
      { type: "GND", name: "Ground", frequency: "121.900" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "124.500" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Johannesburg Control", frequency: "132.150" },
    ],
  },
  {
    icao: "HECA",
    name: "Cairo Intl",
    frequencies: [
      { type: "ATIS", name: "ATIS", frequency: "126.900" },
      { type: "GND", name: "Ground", frequency: "121.700" },
      { type: "TWR", name: "Tower", frequency: "118.100" },
      { type: "DEP", name: "Departure", frequency: "124.100" },
      { type: "APP", name: "Approach", frequency: "119.100" },
      { type: "CTR", name: "Cairo Control", frequency: "132.000" },
    ],
  },
];

// ── Lookup helper ───────────────────────────────────────────────────────

const freqMap = new Map<string, AirportFrequencies>();
for (const af of ATC_FREQUENCIES) {
  freqMap.set(af.icao, af);
}

export function getFrequenciesByIcao(icao: string): AirportFrequencies | null {
  return freqMap.get(icao.toUpperCase()) ?? null;
}
