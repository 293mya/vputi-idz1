import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertDialog, Button, DropdownMenu, IconButton, RadioCards, TextField } from '@radix-ui/themes'
import { MobileDatePicker, MobileTimePicker } from '@mui/x-date-pickers'
import dayjs from 'dayjs'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { clearAuth, loadAuth, loadTrips, removeTrip, saveAuth, saveTrip } from './storage.js'
import { scanTicketPdf } from './ticketScanner.js'
import { searchGlobalPlaces } from './placeSearch.js'
import { findRailStops } from './routeStops.js'
import { findNearestTripId, formatDuration, formatStopsCount, groupTrips, isTripPast, splitTripsByStatus } from './tripUtils.js'
import { DEMO_EMAIL, DEMO_PASSWORD, validateDemoCredentials } from './demoAuth.js'

const TRANSPORTS = {
  train: { label: 'Поезд', icon: 'train' },
  plane: { label: 'Самолёт', icon: 'plane' },
  bus: { label: 'Автобус', icon: 'bus' },
}

const PLACE_LABELS = {
  train: { label: 'Вокзал или станция', placeholder: 'Выберите вокзал или станцию' },
  plane: { label: 'Аэропорт', placeholder: 'Выберите аэропорт' },
  bus: { label: 'Остановка или автовокзал', placeholder: 'Выберите остановку или автовокзал' },
}

const PLACE_CATALOG = [
  { transport: 'plane', city: 'Барселона', name: 'Аэропорт Эль-Прат, BCN', address: '08820 Эль-Прат-де-Льобрегат' },
  { transport: 'plane', city: 'Барселона', name: 'Аэропорт Жирона — Коста-Брава, GRO', address: '17185 Вилоби-д’Оньяр' },
  { transport: 'plane', city: 'Барселона', name: 'Аэропорт Реус, REU', address: '43204 Реус' },
  { transport: 'plane', city: 'Лондон', name: 'Аэропорт Хитроу, LHR', address: 'Hounslow, TW6' },
  { transport: 'plane', city: 'Лондон', name: 'Аэропорт Гатвик, LGW', address: 'Horley, RH6' },
  { transport: 'plane', city: 'Лондон', name: 'Аэропорт Станстед, STN', address: 'Bassingbourn Road' },
  { transport: 'plane', city: 'Лондон', name: 'Аэропорт Лутон, LTN', address: 'Airport Way, Luton' },
  { transport: 'plane', city: 'Брюссель', name: 'Аэропорт Брюсселя, BRU', address: 'Leopoldlaan, Zaventem' },
  { transport: 'plane', city: 'Брюссель', name: 'Аэропорт Шарлеруа, CRL', address: 'Rue des Fusillés, Charleroi' },
  { transport: 'plane', city: 'Мадрид', name: 'Аэропорт Барахас, MAD', address: 'Avenida de la Hispanidad' },
  { transport: 'plane', city: 'Амстердам', name: 'Аэропорт Схипхол, AMS', address: 'Evert van de Beekstraat 202' },
  { transport: 'plane', city: 'Париж', name: 'Аэропорт Шарль-де-Голль, CDG', address: 'Roissy-en-France' },
  { transport: 'plane', city: 'Париж', name: 'Аэропорт Орли, ORY', address: 'Orly' },
  { transport: 'plane', city: 'Берлин', name: 'Аэропорт Берлин-Бранденбург, BER', address: 'Melli-Beese-Ring 1' },
  { transport: 'plane', city: 'Рим', name: 'Аэропорт Фьюмичино, FCO', address: 'Via dell’Aeroporto di Fiumicino' },
  { transport: 'plane', city: 'Милан', name: 'Аэропорт Мальпенса, MXP', address: 'Ferno, Province of Varese' },
  { transport: 'plane', city: 'Лиссабон', name: 'Аэропорт Умберту Делгаду, LIS', address: 'Alameda das Comunidades Portuguesas' },
  { transport: 'plane', city: 'Вена', name: 'Аэропорт Вена-Швехат, VIE', address: '1300 Schwechat' },
  { transport: 'plane', city: 'Прага', name: 'Аэропорт имени Вацлава Гавела, PRG', address: 'Aviatická' },
  { transport: 'plane', city: 'Цюрих', name: 'Аэропорт Цюрих, ZRH', address: '8058 Kloten' },
  { transport: 'plane', city: 'Варшава', name: 'Аэропорт имени Шопена, WAW', address: 'Żwirki i Wigury 1' },
  { transport: 'plane', city: 'Валенсия', name: 'Аэропорт Валенсия, VLC', address: 'Carretera del Aeropuerto' },
  { transport: 'plane', city: 'Севилья', name: 'Аэропорт Севилья, SVQ', address: 'A-4, Km 532' },

  { transport: 'train', city: 'Барселона', name: 'Вокзал Barcelona Sants', address: 'Plaça dels Països Catalans' },
  { transport: 'train', city: 'Барселона', name: 'Станция Passeig de Gràcia', address: 'Passeig de Gràcia, 43' },
  { transport: 'train', city: 'Барселона', name: 'Вокзал Estació de França', address: 'Avinguda del Marquès de l’Argentera' },
  { transport: 'train', city: 'Барселона', name: 'Станция Plaça de Catalunya', address: 'Plaça de Catalunya' },
  { transport: 'train', city: 'Барселона', name: 'Станция Arc de Triomf', address: 'Avinguda de Vilanova' },
  { transport: 'train', city: 'Барселона', name: 'Станция El Clot–Aragó', address: 'Carrer d’Aragó' },
  { transport: 'train', city: 'Лондон', name: 'Вокзал St Pancras International', address: 'Euston Road' },
  { transport: 'train', city: 'Лондон', name: 'Вокзал King’s Cross', address: 'Euston Road' },
  { transport: 'train', city: 'Лондон', name: 'Вокзал Victoria', address: 'Victoria Street' },
  { transport: 'train', city: 'Брюссель', name: 'Вокзал Брюссель-Миди', address: 'Avenue Fonsny 47B' },
  { transport: 'train', city: 'Брюссель', name: 'Центральный вокзал Брюсселя', address: 'Carrefour de l’Europe 2' },
  { transport: 'train', city: 'Роттердам', name: 'Центральный вокзал Роттердама', address: 'Stationsplein 2' },
  { transport: 'train', city: 'Роттердам', name: 'Станция Rotterdam Blaak', address: 'Blaak 1' },
  { transport: 'train', city: 'Антверпен', name: 'Центральный вокзал Антверпена', address: 'Koningin Astridplein 27' },
  { transport: 'train', city: 'Мадрид', name: 'Вокзал Madrid Atocha', address: 'Glorieta del Emperador Carlos V' },
  { transport: 'train', city: 'Париж', name: 'Вокзал Gare du Nord', address: '18 Rue de Dunkerque' },
  { transport: 'train', city: 'Париж', name: 'Вокзал Gare de Lyon', address: 'Place Louis-Armand' },
  { transport: 'train', city: 'Берлин', name: 'Центральный вокзал Берлина', address: 'Europaplatz 1' },
  { transport: 'train', city: 'Рим', name: 'Вокзал Roma Termini', address: 'Piazza dei Cinquecento' },
  { transport: 'train', city: 'Милан', name: 'Вокзал Milano Centrale', address: 'Piazza Duca d’Aosta' },
  { transport: 'train', city: 'Лиссабон', name: 'Вокзал Lisboa Oriente', address: 'Avenida Dom João II' },
  { transport: 'train', city: 'Вена', name: 'Центральный вокзал Вены', address: 'Am Hauptbahnhof 1' },
  { transport: 'train', city: 'Прага', name: 'Главный вокзал Праги', address: 'Wilsonova 300/8' },
  { transport: 'train', city: 'Цюрих', name: 'Центральный вокзал Цюриха', address: 'Bahnhofplatz 15' },
  { transport: 'train', city: 'Варшава', name: 'Вокзал Warszawa Centralna', address: 'Aleje Jerozolimskie 54' },
  { transport: 'train', city: 'Валенсия', name: 'Вокзал València Joaquín Sorolla', address: 'Carrer de Sant Vicent Màrtir, 171' },
  { transport: 'train', city: 'Севилья', name: 'Вокзал Sevilla Santa Justa', address: 'Avenida de Kansas City' },

  { transport: 'plane', city: 'Мюнхен', name: 'Аэропорт Мюнхен, MUC', address: 'Nordallee 25' },
  { transport: 'train', city: 'Мюнхен', name: 'Центральный вокзал Мюнхена', address: 'Bayerstraße 10A' },
  { transport: 'plane', city: 'Франкфурт', name: 'Аэропорт Франкфурт, FRA', address: 'Hugo-Eckener-Ring' },
  { transport: 'train', city: 'Франкфурт', name: 'Центральный вокзал Франкфурта', address: 'Am Hauptbahnhof' },
  { transport: 'plane', city: 'Эдинбург', name: 'Аэропорт Эдинбург, EDI', address: 'Edinburgh EH12 9DN' },
  { transport: 'train', city: 'Эдинбург', name: 'Вокзал Edinburgh Waverley', address: 'Princes Street' },
  { transport: 'plane', city: 'Дублин', name: 'Аэропорт Дублин, DUB', address: 'Collinstown, Dublin' },
  { transport: 'train', city: 'Дублин', name: 'Вокзал Dublin Connolly', address: 'Amiens Street' },
  { transport: 'plane', city: 'Копенгаген', name: 'Аэропорт Копенгаген, CPH', address: 'Lufthavnsboulevarden 6' },
  { transport: 'train', city: 'Копенгаген', name: 'Центральный вокзал Копенгагена', address: 'Bernstorffsgade 16' },
  { transport: 'plane', city: 'Стокгольм', name: 'Аэропорт Стокгольм-Арланда, ARN', address: '190 45 Stockholm-Arlanda' },
  { transport: 'train', city: 'Стокгольм', name: 'Центральный вокзал Стокгольма', address: 'Centralplan 15' },
  { transport: 'plane', city: 'Осло', name: 'Аэропорт Осло-Гардермуэн, OSL', address: 'Edvard Munchs veg' },
  { transport: 'train', city: 'Осло', name: 'Центральный вокзал Осло', address: 'Jernbanetorget 1' },
  { transport: 'plane', city: 'Хельсинки', name: 'Аэропорт Хельсинки-Вантаа, HEL', address: 'Lentoasemantie 1' },
  { transport: 'train', city: 'Хельсинки', name: 'Центральный вокзал Хельсинки', address: 'Kaivokatu 1' },
  { transport: 'plane', city: 'Афины', name: 'Аэропорт Афины, ATH', address: 'Attiki Odos, Spata' },
  { transport: 'train', city: 'Афины', name: 'Вокзал Афины', address: 'Domokou Avenue' },
  { transport: 'plane', city: 'Стамбул', name: 'Аэропорт Стамбул, IST', address: 'Tayakadın Terminal Caddesi' },
  { transport: 'train', city: 'Стамбул', name: 'Вокзал Söğütlüçeşme', address: 'Kadıköy' },
  { transport: 'plane', city: 'Будапешт', name: 'Аэропорт имени Ференца Листа, BUD', address: 'Budapest 1185' },
  { transport: 'train', city: 'Будапешт', name: 'Вокзал Budapest Keleti', address: 'Kerepesi út 2-4' },
  { transport: 'plane', city: 'Бухарест', name: 'Аэропорт Бухарест-Отопень, OTP', address: 'Calea Bucureştilor 224E' },
  { transport: 'train', city: 'Бухарест', name: 'Северный вокзал Бухареста', address: 'Piața Gării de Nord' },
  { transport: 'plane', city: 'Загреб', name: 'Аэропорт Загреб, ZAG', address: 'Ulica Rudolfa Fizira 1' },
  { transport: 'train', city: 'Загреб', name: 'Главный вокзал Загреба', address: 'Trg kralja Tomislava 12' },
  { transport: 'plane', city: 'Любляна', name: 'Аэропорт Любляна, LJU', address: 'Zgornji Brnik 130A' },
  { transport: 'train', city: 'Любляна', name: 'Вокзал Любляна', address: 'Trg Osvobodilne fronte 6' },
  { transport: 'plane', city: 'Белград', name: 'Аэропорт Никола Тесла, BEG', address: 'Aerodrom Beograd 59' },
  { transport: 'train', city: 'Белград', name: 'Вокзал Београд-Центар', address: 'Prokupačka' },
  { transport: 'plane', city: 'Москва', name: 'Аэропорт Шереметьево, SVO', address: 'Химки, Московская область' },
  { transport: 'plane', city: 'Москва', name: 'Аэропорт Домодедово, DME', address: 'Домодедово, Московская область' },
  { transport: 'plane', city: 'Москва', name: 'Аэропорт Внуково, VKO', address: 'Москва, Внуково' },
  { transport: 'plane', city: 'Москва', name: 'Аэропорт Жуковский, ZIA', address: 'Жуковский, Московская область' },
  { transport: 'train', city: 'Москва', name: 'Ленинградский вокзал', address: 'Комсомольская площадь, 3' },
  { transport: 'train', city: 'Москва', name: 'Казанский вокзал', address: 'Комсомольская площадь, 2' },
  { transport: 'train', city: 'Москва', name: 'Курский вокзал', address: 'улица Земляной Вал, 29' },
  { transport: 'train', city: 'Москва', name: 'Белорусский вокзал', address: 'площадь Тверская Застава, 7' },

  { transport: 'bus', city: 'Барселона', name: 'Автовокзал Estació del Nord', address: 'Carrer d’Alí Bei, 80' },
  { transport: 'bus', city: 'Барселона', name: 'Остановка Barcelona Sants', address: 'Plaça dels Països Catalans' },
  { transport: 'bus', city: 'Барселона', name: 'Aerobús Plaça Catalunya', address: 'Plaça de Catalunya' },
  { transport: 'bus', city: 'Лондон', name: 'Автовокзал Victoria Coach Station', address: '164 Buckingham Palace Road' },
  { transport: 'bus', city: 'Лондон', name: 'Остановка Stratford City', address: 'Montfichet Road' },
  { transport: 'bus', city: 'Брюссель', name: 'Автостанция Brussels-North', address: 'Rue du Progrès 76' },
  { transport: 'bus', city: 'Брюссель', name: 'Остановка Brussels-Midi', address: 'Avenue Fonsny' },
  { transport: 'bus', city: 'Роттердам', name: 'Автостанция Zuidplein', address: 'Gooilandsingel 101' },
  { transport: 'bus', city: 'Роттердам', name: 'Остановка Rotterdam Centraal', address: 'Conradstraat' },
  { transport: 'bus', city: 'Антверпен', name: 'Остановка Roosevelt', address: 'Rooseveltplaats' },
  { transport: 'bus', city: 'Мадрид', name: 'Автовокзал Méndez Álvaro', address: 'Calle de Méndez Álvaro, 83' },
]

const CITY_SEARCH_TERMS = {
  Барселона: ['barcelona', 'испания', 'spain', 'españa'],
  Мадрид: ['madrid', 'испания', 'spain', 'españa'],
  Валенсия: ['valencia', 'испания', 'spain', 'españa'],
  Севилья: ['sevilla', 'seville', 'испания', 'spain', 'españa'],
  Лондон: ['london', 'великобритания', 'англия', 'united kingdom', 'uk', 'england'],
  Брюссель: ['brussels', 'bruxelles', 'бельгия', 'belgium'],
  Антверпен: ['antwerp', 'antwerpen', 'бельгия', 'belgium'],
  Роттердам: ['rotterdam', 'нидерланды', 'голландия', 'netherlands', 'holland'],
  Амстердам: ['amsterdam', 'нидерланды', 'голландия', 'netherlands', 'holland'],
  Париж: ['paris', 'франция', 'france'],
  Берлин: ['berlin', 'германия', 'germany', 'deutschland'],
  Рим: ['rome', 'roma', 'италия', 'italy', 'italia'],
  Милан: ['milan', 'milano', 'италия', 'italy', 'italia'],
  Лиссабон: ['lisbon', 'lisboa', 'португалия', 'portugal'],
  Вена: ['vienna', 'wien', 'австрия', 'austria'],
  Прага: ['prague', 'praha', 'чехия', 'czechia', 'czech republic'],
  Цюрих: ['zurich', 'zürich', 'швейцария', 'switzerland'],
  Варшава: ['warsaw', 'warszawa', 'польша', 'poland'],
  Мюнхен: ['munich', 'münchen', 'германия', 'germany', 'deutschland'],
  Франкфурт: ['frankfurt', 'германия', 'germany', 'deutschland'],
  Эдинбург: ['edinburgh', 'шотландия', 'scotland', 'великобритания', 'united kingdom', 'uk'],
  Дублин: ['dublin', 'ирландия', 'ireland'],
  Копенгаген: ['copenhagen', 'københavn', 'дания', 'denmark'],
  Стокгольм: ['stockholm', 'швеция', 'sweden'],
  Осло: ['oslo', 'норвегия', 'norway'],
  Хельсинки: ['helsinki', 'финляндия', 'finland'],
  Афины: ['athens', 'athina', 'греция', 'greece'],
  Стамбул: ['istanbul', 'турция', 'turkey', 'türkiye'],
  Будапешт: ['budapest', 'венгрия', 'hungary'],
  Бухарест: ['bucharest', 'bucurești', 'румыния', 'romania'],
  Загреб: ['zagreb', 'хорватия', 'croatia'],
  Любляна: ['ljubljana', 'словения', 'slovenia'],
  Белград: ['belgrade', 'beograd', 'сербия', 'serbia'],
  Москва: ['moscow', 'мск', 'moskva', 'россия', 'russia'],
}

function normalizeSearch(value) {
  return value
    .toLocaleLowerCase('ru-RU')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/g, 'е')
    .trim()
}

function getPlaceSuggestions(transport, cityValue, placeValue) {
  const cityQuery = normalizeSearch(cityValue)
  const placeQuery = normalizeSearch(placeValue)

  if (cityQuery.length < 2) return []

  return PLACE_CATALOG.filter((place) => {
    const cityTerms = [place.city, ...(CITY_SEARCH_TERMS[place.city] ?? [])].map(normalizeSearch)
    const cityMatches = cityTerms.some((term) => term.includes(cityQuery) || cityQuery.includes(term))
    const placeMatches = !placeQuery || normalizeSearch(place.name).includes(placeQuery)
    return place.transport === transport && cityMatches && placeMatches
  }).slice(0, 8)
}

const initialForm = {
  transport: 'train',
  originCity: '',
  originPlace: '',
  originAddress: '',
  originLatitude: null,
  originLongitude: null,
  destinationCity: '',
  destinationPlace: '',
  destinationAddress: '',
  destinationLatitude: null,
  destinationLongitude: null,
  date: '',
  time: '',
  arrivalDate: '',
  arrivalTime: '',
  stopsCount: '',
  travelNumber: '',
  terminal: '',
  platform: '',
  ticket: null,
}

const MAX_TICKET_SIZE = 10 * 1024 * 1024
let hasUnsavedFormChanges = false

function formatGroupDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatScheduleDate(date) {
  if (!date) return 'Дата не указана'
  const value = new Date(`${date}T00:00:00`)
  const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(value)
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(value).replace('.', '')
  return `${shortDate}, ${weekday}`
}

function Icon({ name, size = 24 }) {
  const paths = {
    plane: <path d="M21.2 16.2 13 13.1V19l2.1 1.5V22L12 21l-3.1 1v-1.5L11 19v-5.9l-8.2 3.1v-2L11 9V3.7a1 1 0 0 1 2 0V9l8.2 5.2v2Z" />,
    train: <><path d="M7 3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" /><path d="M7 19 5 22m12-3 2 3M4 9h16M8 15h.01M16 15h.01" /></>,
    bus: <><path d="M5 4h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M3 10h18M7 19v2m10-2v2M7 15h.01M17 15h.01" /></>,
    ticket: <><path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" /><path d="M13 8v2m0 4v2" /></>,
    plus: <path d="M12 5v14m-7-7h14" />,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M5 14v5h14v-5" /></>,
    dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    edit: <><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m14.5 6.5 3 3" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7" /><path d="M10 11v5m4-5v5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></>,
  }

  return (
    <svg aria-hidden="true" className={`icon icon-${name}`} fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  )
}

function RoutePoint({ time, date, city, place, address, isLast = false }) {
  return (
    <span className={`route-point ${isLast ? 'route-point-last' : ''}`}>
      <span className="route-marker" aria-hidden="true" />
      <span className="route-time">
        <strong>{time || '—:—'}</strong>
        <small>{formatScheduleDate(date)}</small>
      </span>
      <span className="route-copy">
        <strong>{city}</strong>
        <span>{place}</span>
        {address && <small>{address}</small>}
      </span>
    </span>
  )
}

function TripsPage({ trips, onDeleteTrip, onLogout }) {
  const navigate = useNavigate()
  const [tripToDelete, setTripToDelete] = useState(null)
  const [pastOpen, setPastOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [transport, setTransport] = useState('all')
  const [date, setDate] = useState('')
  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const text = `${trip.originCity} ${trip.destinationCity} ${trip.originPlace} ${trip.destinationPlace}`.toLocaleLowerCase('ru-RU')
    return (!query || text.includes(query.toLocaleLowerCase('ru-RU')))
      && (transport === 'all' || trip.transport === transport)
      && (!date || trip.date === date)
  }), [trips, query, transport, date])
  const { upcomingGroups, pastGroups, nearestTripId, now, pastTripsCount } = useMemo(() => {
    const currentTime = new Date()
    const { upcoming: upcomingTrips, past: pastTrips } = splitTripsByStatus(filteredTrips, currentTime)
    const sortedTrips = [...upcomingTrips, ...pastTrips]

    return {
      upcomingGroups: groupTrips(upcomingTrips),
      pastGroups: groupTrips(pastTrips),
      nearestTripId: findNearestTripId(sortedTrips, currentTime),
      now: currentTime,
      pastTripsCount: pastTrips.length,
    }
  }, [filteredTrips])

  function renderGroups(groups) {
    return groups.map((group) => (
      <section className="trip-group" key={group.date}>
        <h2>{formatGroupDate(group.date)}</h2>
        <div className="trip-list">
          {group.trips.map((trip) => {
            const duration = formatDuration(trip)
            const isNearest = trip.id === nearestTripId
            const isPast = isTripPast(trip, now)

            return (
              <article className={`trip-entry ${isNearest ? 'trip-entry-nearest' : ''} ${isPast ? 'trip-entry-past' : ''}`.trim()} key={trip.id}>
                <header className="trip-summary">
                  <h3>{trip.originCity} — {trip.destinationCity}</h3>
                  <p>{duration ? `${duration} в пути` : 'Время прибытия не указано'}</p>
                </header>
                <div className="trip-card">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <IconButton
                        className="trip-menu-button"
                        aria-label={`Действия с поездкой ${trip.originCity} — ${trip.destinationCity}`}
                        radius="full"
                        variant="soft"
                      >
                        <Icon name="dots" size={21} />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" className="trip-menu-content">
                      <DropdownMenu.Item onSelect={() => navigate(`/edit/${trip.id}`)}>
                        <Icon name="edit" size={17} />
                        Редактировать
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item color="red" onSelect={() => setTripToDelete(trip)}>
                        <Icon name="trash" size={17} />
                        Удалить
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>

                  <a className="trip-card-link" href={trip.ticketUrl} target="_blank" rel="noreferrer" aria-label={`Открыть билет: ${trip.originCity} — ${trip.destinationCity}`}>
                    <span className="trip-card-topline">
                      <span className="transport-chip"><Icon name={TRANSPORTS[trip.transport].icon} size={21} />{TRANSPORTS[trip.transport].label}</span>
                      {isNearest && <span className="nearest-badge">Ближайшая поездка</span>}
                    </span>
                    <span className="route-layout"><span className="route-timeline">
                      <RoutePoint time={trip.time} date={trip.date} city={trip.originCity} place={trip.originPlace} address={trip.originAddress} />
                      {trip.transport === 'train' && formatStopsCount(trip.stopsCount) && (
                        <span className="train-segment-summary"><strong>{trip.stopsCount}</strong><span>{formatStopsCount(trip.stopsCount).replace(/^\d+\s*/, '')}</span></span>
                      )}
                      <RoutePoint time={trip.arrivalTime} date={trip.arrivalDate} city={trip.destinationCity} place={trip.destinationPlace} address={trip.destinationAddress} isLast />
                    </span></span>
                    {duration && <span className="ticket-check-note">Проверьте время по билету</span>}
                    <span className="open-ticket">Открыть билет ↗</span>
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    ))
  }

  return (
    <main className="page trips-page">
      <header className="page-header trips-header">
        <h1>Мои поездки</h1>
        <Button className="logout-button" color="gray" variant="soft" onClick={onLogout}>
          <Icon name="logout" size={18} />
          Выйти
        </Button>
      </header>
      <p className="demo-session-note">Демовход работает только в этом браузере и не защищает локальные данные.</p>
      <section className="trip-tools" aria-label="Поиск и фильтры">
        <div className="trip-tools-heading">
          <span>Найти маршрут</span>
          <small>По городу, месту или дате</small>
        </div>
        <div className="trip-search-field">
          <Icon name="search" size={19} />
          <TextField.Root aria-label="Поиск по городу или месту" placeholder="Город или место" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <label className="trip-filter">
          <span>Транспорт</span>
          <select aria-label="Фильтр по транспорту" value={transport} onChange={(event) => setTransport(event.target.value)}><option value="all">Все поездки</option><option value="train">Поезд</option><option value="plane">Самолёт</option><option value="bus">Автобус</option></select>
        </label>
        <label className="trip-filter">
          <span>Дата</span>
          <input aria-label="Фильтр по дате" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </section>

      {upcomingGroups.length === 0 && pastGroups.length === 0 ? (
        <section className="empty-state" aria-labelledby="empty-title">
          <div className="empty-visual" aria-hidden="true">
            <div className="empty-ticket ticket-back"><Icon name="train" size={22} /></div>
            <div className="empty-ticket ticket-front"><Icon name="plane" size={26} /></div>
          </div>
          <h2 id="empty-title">{trips.length ? 'Ничего не найдено' : 'Пока нет поездок'}</h2>
          <p>{trips.length ? 'Измените запрос или фильтры.' : 'Добавьте PDF-билет и данные маршрута — поездка появится здесь.'}</p>
          <Button asChild className="primary-button empty-action" radius="large" size="3">
            <NavLink to="/add"><Icon name="plus" size={19} />Добавить билет</NavLink>
          </Button>
        </section>
      ) : (
        <div className="trip-groups" aria-live="polite">
          {upcomingGroups.length > 0 && <section className="trip-section"><h2 className="trip-section-title">Предстоящие</h2>{renderGroups(upcomingGroups)}</section>}
          {pastGroups.length > 0 && (
            <section className="trip-section">
              <button className="past-trips-toggle" type="button" aria-expanded={pastOpen} onClick={() => setPastOpen((open) => !open)}>
                <span>Прошедшие</span><span>{pastTripsCount}</span><span aria-hidden="true">{pastOpen ? '⌃' : '⌄'}</span>
              </button>
              {pastOpen && renderGroups(pastGroups)}
            </section>
          )}
        </div>
      )}

      <AlertDialog.Root open={Boolean(tripToDelete)} onOpenChange={(open) => !open && setTripToDelete(null)}>
        <AlertDialog.Content className="delete-dialog" maxWidth="420px">
          <AlertDialog.Title>Удалить поездку?</AlertDialog.Title>
          <AlertDialog.Description>
            {tripToDelete && `${tripToDelete.originCity} — ${tripToDelete.destinationCity}`}. Билет исчезнет из текущего списка.
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel>
              <Button color="gray" variant="soft">Отмена</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={() => {
                if (tripToDelete) onDeleteTrip(tripToDelete.id)
                setTripToDelete(null)
              }}>
                Удалить
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </main>
  )
}

function Field({ label, name, value, error, onChange, optional = false, changed = false, ...inputProps }) {
  const errorId = `${name}-error`

  return (
    <div className="field-group">
      <label htmlFor={name}>
        {label}
        <span className="field-label-meta">
          {optional && <span className="optional-label">необ.</span>}
          {changed && <span className="changed-label">Изменено</span>}
        </span>
      </label>
      <TextField.Root
        {...inputProps}
        className={`${error ? 'field-invalid' : ''} ${changed ? 'field-changed' : ''}`.trim()}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        size="3"
        radius="large"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p className="error-message" id={errorId}>{error}</p>}
    </div>
  )
}

function PlaceAutocomplete({ prefix, form, error, transport, onChange, onSelect, changed = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [searchState, setSearchState] = useState('idle')
  const cityValue = form[`${prefix}City`]
  const placeValue = form[`${prefix}Place`]
  const listId = `${prefix}-place-suggestions`
  const placeCopy = PLACE_LABELS[transport]

  useEffect(() => {
    const cityQuery = normalizeSearch(cityValue)
    if (cityQuery.length < 2) {
      setSuggestions([])
      setSearchState('idle')
      return undefined
    }

    const localResults = getPlaceSuggestions(transport, cityValue, placeValue)
    if (cityQuery.length < 4 && localResults.length) {
      setSuggestions(localResults)
      setSearchState('ready')
      setIsOpen(true)
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setSearchState('loading')
      setIsOpen(true)
      try {
        const results = await searchGlobalPlaces({ transport, city: cityValue, place: placeValue, signal: controller.signal })
        const allResults = [...localResults, ...results]
        setSuggestions(allResults.filter((item, index, list) => list.findIndex((other) => other.name === item.name && other.city === item.city) === index).slice(0, 8))
        setSearchState('ready')
      } catch (searchError) {
        if (searchError.name === 'AbortError') return
        setSuggestions(getPlaceSuggestions(transport, cityValue, placeValue))
        setSearchState('fallback')
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [cityValue, placeValue, transport])

  function handlePlaceChange(event) {
    onChange(event)
    setIsOpen(true)
  }

  return (
    <div className="place-autocomplete">
      <Field
        label={placeCopy.label}
        name={`${prefix}Place`}
        value={placeValue}
        error={error}
        changed={changed}
        onChange={handlePlaceChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false)
        }}
        placeholder={placeCopy.placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listId}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="place-suggestions" id={listId} role="listbox" aria-label={`${placeCopy.label}: варианты`}>
          {suggestions.map((suggestion) => (
            <button
              className="place-suggestion"
              key={`${suggestion.city}-${suggestion.name}`}
              type="button"
              role="option"
              aria-selected="false"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(prefix, suggestion)
                setIsOpen(false)
              }}
            >
              <span className="suggestion-icon" aria-hidden="true">
                <Icon name={TRANSPORTS[transport].icon} size={18} />
              </span>
              <span>
                <strong>{suggestion.name}</strong>
                <small>{suggestion.city} · {suggestion.address}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchState === 'loading' && <p className="suggestion-hint">Ищем по мировому справочнику…</p>}

      {isOpen && searchState === 'fallback' && suggestions.length > 0 && <p className="suggestion-hint">Показываем локальные варианты. Мировой справочник сейчас недоступен.</p>}

      {isOpen && searchState !== 'loading' && normalizeSearch(cityValue).length >= 2 && suggestions.length === 0 && !placeValue && (
        <p className="suggestion-hint">Для этого города пока нет подходящих мест.</p>
      )}
    </div>
  )
}

function LocationFields({ title, prefix, form, errors, transport, onChange, onSelectPlace, changedFields = new Set() }) {
  function handleCityChange(event) {
    onChange(event)
  }

  return (
    <section className="location-section" aria-labelledby={`${prefix}-title`}>
      <div className="section-heading">
        <span className="section-number" aria-hidden="true">{prefix === 'origin' ? 'A' : 'B'}</span>
        <h2 id={`${prefix}-title`}>{title}</h2>
      </div>

      <Field
        label="Город"
        name={`${prefix}City`}
        value={form[`${prefix}City`]}
        error={errors[`${prefix}City`]}
        changed={changedFields.has(`${prefix}City`)}
        onChange={handleCityChange}
        placeholder={prefix === 'origin' ? 'Например, Барселона' : 'Например, Лондон'}
        autoComplete="off"
      />
      <PlaceAutocomplete
        prefix={prefix}
        form={form}
        error={errors[`${prefix}Place`]}
        changed={changedFields.has(`${prefix}Place`)}
        transport={transport}
        onChange={onChange}
        onSelect={onSelectPlace}
      />
      <Field
        label="Адрес"
        name={`${prefix}Address`}
        value={form[`${prefix}Address`]}
        error={errors[`${prefix}Address`]}
        changed={changedFields.has(`${prefix}Address`)}
        onChange={onChange}
        placeholder="Улица, терминал или ориентир"
        autoComplete="off"
        optional
      />
    </section>
  )
}

function MobilePickerField({ label, name, value, error, onChange, type, optional = false, changed = false }) {
  const Picker = type === 'date' ? MobileDatePicker : MobileTimePicker
  const timePickerProps = type === 'time' ? { ampm: false, minutesStep: 1 } : {}
  const pickerValue = value
    ? type === 'date'
      ? dayjs(value)
      : dayjs(`2000-01-01T${value}`)
    : null

  return (
    <div className={`field-group mobile-picker-field ${changed ? 'picker-changed' : ''}`}>
      <label htmlFor={name}>
        {label}
        <span className="field-label-meta">
          {optional && <span className="optional-label">необ.</span>}
          {changed && <span className="changed-label">Изменено</span>}
        </span>
      </label>
      <Picker
        value={pickerValue}
        onChange={(nextValue) => {
          if (!nextValue || !nextValue.isValid()) {
            onChange(name, '')
            return
          }

          onChange(name, nextValue.format(type === 'date' ? 'YYYY-MM-DD' : 'HH:mm'))
        }}
        format={type === 'date' ? 'DD.MM.YYYY' : 'HH:mm'}
        {...timePickerProps}
        slotProps={{
          textField: {
            id: name,
            fullWidth: true,
            error: Boolean(error),
            helperText: error,
            placeholder: type === 'date' ? 'ДД.ММ.ГГГГ' : 'ЧЧ:ММ',
          },
          mobilePaper: {
            className: 'android-picker-paper',
          },
          actionBar: {
            actions: ['cancel', 'accept'],
          },
        }}
      />
    </div>
  )
}

const EDITABLE_FIELDS = [
  'transport',
  'originCity',
  'originPlace',
  'originAddress',
  'destinationCity',
  'destinationPlace',
  'destinationAddress',
  'date',
  'time',
  'arrivalDate',
  'arrivalTime',
  'stopsCount',
  'travelNumber',
  'terminal',
  'platform',
]

function formFromTrip(trip) {
  if (!trip) return initialForm

  return {
    transport: trip.transport,
    originCity: trip.originCity,
    originPlace: trip.originPlace,
    originAddress: trip.originAddress ?? '',
    originLatitude: trip.originLatitude ?? null,
    originLongitude: trip.originLongitude ?? null,
    destinationCity: trip.destinationCity,
    destinationPlace: trip.destinationPlace,
    destinationAddress: trip.destinationAddress ?? '',
    destinationLatitude: trip.destinationLatitude ?? null,
    destinationLongitude: trip.destinationLongitude ?? null,
    date: trip.date,
    time: trip.time,
    arrivalDate: trip.arrivalDate ?? '',
    arrivalTime: trip.arrivalTime ?? '',
    stopsCount: trip.stopsCount == null ? '' : String(trip.stopsCount),
    travelNumber: trip.travelNumber ?? '', terminal: trip.terminal ?? '', platform: trip.platform ?? '',
    ticket: null,
  }
}

function TripFormPage({ mode = 'add', initialTrip = null, onSave, onUnsavedChange, onRequestNavigation }) {
  const navigate = useNavigate()
  const ticketInputRef = useRef(null)
  const isEdit = mode === 'edit'
  const originalForm = useMemo(() => formFromTrip(initialTrip), [initialTrip])
  const [form, setForm] = useState(() => formFromTrip(initialTrip))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [scanState, setScanState] = useState({ status: 'idle', detected: [], fields: {} })
  const [stopsLookup, setStopsLookup] = useState('idle')
  const stopsCountManualRef = useRef(initialTrip?.stopsCount != null)
  const routeSignatureRef = useRef(null)
  const unsavedChangeRef = useRef(onUnsavedChange)
  const changedFields = useMemo(() => {
    if (!isEdit) return new Set()
    const changed = new Set(EDITABLE_FIELDS.filter((field) => form[field] !== originalForm[field]))
    if (form.ticket) changed.add('ticket')
    return changed
  }, [form, isEdit, originalForm])
  const hasChanges = isEdit
    ? changedFields.size > 0
    : Boolean(form.ticket || form.originCity || form.originPlace || form.originAddress || form.destinationCity || form.destinationPlace || form.destinationAddress || form.date || form.time || form.arrivalDate || form.arrivalTime || form.stopsCount || form.travelNumber || form.terminal || form.platform)
  const durationPreview = formatDuration(form)

  useEffect(() => { unsavedChangeRef.current = onUnsavedChange }, [onUnsavedChange])
  useEffect(() => () => unsavedChangeRef.current?.(false), [])
  useEffect(() => {
    const warnBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [])

  function updateField(event) {
    const { name, value, files } = event.target
    onUnsavedChange?.(true)
    if (name === 'stopsCount') stopsCountManualRef.current = true
    setForm((current) => {
      if (name === 'originCity' || name === 'destinationCity') {
        const prefix = name === 'originCity' ? 'origin' : 'destination'
        return {
          ...current,
          [name]: value,
          [`${prefix}Place`]: '',
          [`${prefix}Address`]: '',
          [`${prefix}Latitude`]: null,
          [`${prefix}Longitude`]: null,
        }
      }

      return { ...current, [name]: files ? files[0] ?? null : value }
    })
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function scanTicket(file) {
    if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
      setScanState({ status: 'idle', detected: [], fields: {} })
      return
    }

    setScanState({ status: 'scanning', detected: [], fields: {} })
    try {
      const result = await scanTicketPdf(file)
      setScanState(result.hasUsefulData
        ? { status: 'ready', detected: result.detected, fields: result.fields }
        : { status: 'empty', detected: [], fields: {} })
    } catch {
      setScanState({ status: 'failed', detected: [], fields: {} })
    }
  }

  async function handleTicketChange(event) {
    updateField(event)
    await scanTicket(event.target.files?.[0])
  }

  function applyScannedFields() {
    onUnsavedChange?.(true)
    setForm((current) => ({ ...current, ...scanState.fields }))
    setErrors((current) => {
      const next = { ...current }
      Object.keys(scanState.fields).forEach((field) => { next[field] = '' })
      return next
    })
    setScanState((current) => ({ ...current, status: 'applied' }))
  }

  function updateTransport(value) {
    if (!value) return
    onUnsavedChange?.(true)

    setForm((current) => ({
      ...current,
      transport: value,
      originPlace: '',
      originAddress: '',
      originLatitude: null,
      originLongitude: null,
      destinationPlace: '',
      destinationAddress: '',
      destinationLatitude: null,
      destinationLongitude: null,
      stopsCount: value === 'train' ? current.stopsCount : '',
    }))
    setErrors((current) => ({
      ...current,
      originPlace: '',
      destinationPlace: '',
    }))
  }

  function selectPlace(prefix, suggestion) {
    onUnsavedChange?.(true)
    setForm((current) => ({
      ...current,
      [`${prefix}City`]: suggestion.city,
      [`${prefix}Place`]: suggestion.name,
      [`${prefix}Address`]: suggestion.address,
      [`${prefix}Latitude`]: suggestion.latitude,
      [`${prefix}Longitude`]: suggestion.longitude,
    }))
    setErrors((current) => ({ ...current, [`${prefix}City`]: '', [`${prefix}Place`]: '' }))
  }

  function updateDateTime(name, value) {
    onUnsavedChange?.(true)
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  useEffect(() => {
    const canLookup = form.transport === 'train'
      && form.originLatitude != null && form.originLongitude != null
      && form.destinationLatitude != null && form.destinationLongitude != null
      && form.date && form.time
    if (!canLookup) {
      setStopsLookup('idle')
      return undefined
    }

    const routeSignature = [form.originLatitude, form.originLongitude, form.destinationLatitude, form.destinationLongitude, form.date, form.time].join(':')
    if (routeSignatureRef.current && routeSignatureRef.current !== routeSignature) stopsCountManualRef.current = false
    routeSignatureRef.current = routeSignature

    const controller = new AbortController()
    setStopsLookup('loading')
    findRailStops({ ...form, signal: controller.signal })
      .then(({ status, count }) => {
        if (status === 'ready' && !stopsCountManualRef.current) setForm((current) => ({ ...current, stopsCount: String(count) }))
        setStopsLookup(status)
      })
      .catch((routeError) => {
        if (routeError.name !== 'AbortError') setStopsLookup('failed')
      })

    return () => controller.abort()
  }, [form.transport, form.originLatitude, form.originLongitude, form.destinationLatitude, form.destinationLongitude, form.date, form.time])

  function validate() {
    const nextErrors = {}

    if (!form.ticket && !initialTrip?.ticketBlob) nextErrors.ticket = 'Прикрепите PDF-билет'
    if (form.ticket && form.ticket.type !== 'application/pdf' && !form.ticket.name.toLowerCase().endsWith('.pdf')) {
      nextErrors.ticket = 'Выберите файл в формате PDF'
    }
    if (form.ticket && form.ticket.size > MAX_TICKET_SIZE) nextErrors.ticket = 'PDF должен быть меньше 10 МБ'
    if (!form.originCity.trim()) nextErrors.originCity = 'Укажите город отправления'
    if (!form.originPlace.trim()) nextErrors.originPlace = 'Укажите место отправления'
    if (!form.destinationCity.trim()) nextErrors.destinationCity = 'Укажите город прибытия'
    if (!form.destinationPlace.trim()) nextErrors.destinationPlace = 'Укажите место прибытия'
    if (!form.date) nextErrors.date = 'Выберите дату отправления'
    if (!form.time) nextErrors.time = 'Выберите время отправления'
    if (form.arrivalDate && !form.arrivalTime) nextErrors.arrivalTime = 'Выберите время прибытия'
    if (!form.arrivalDate && form.arrivalTime) nextErrors.arrivalDate = 'Выберите дату прибытия'
    if (form.arrivalDate && form.arrivalTime && !durationPreview) {
      nextErrors.arrivalTime = 'Прибытие должно быть позже отправления'
    }
    if (form.transport === 'train' && form.stopsCount !== '') {
      const stopsCount = Number(form.stopsCount)
      if (!Number.isInteger(stopsCount) || stopsCount < 0 || stopsCount > 99) {
        nextErrors.stopsCount = 'Укажите целое число от 0 до 99'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return

    const ticketBlob = form.ticket ?? initialTrip.ticketBlob
    const ticketName = form.ticket ? form.ticket.name : initialTrip.ticketName

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        id: initialTrip?.id ?? crypto.randomUUID(),
        transport: form.transport,
        originCity: form.originCity.trim(),
        originPlace: form.originPlace.trim(),
        originAddress: form.originAddress.trim(),
        originLatitude: form.originLatitude,
        originLongitude: form.originLongitude,
        destinationCity: form.destinationCity.trim(),
        destinationPlace: form.destinationPlace.trim(),
        destinationAddress: form.destinationAddress.trim(),
        destinationLatitude: form.destinationLatitude,
        destinationLongitude: form.destinationLongitude,
        date: form.date,
        time: form.time,
        arrivalDate: form.arrivalDate,
        arrivalTime: form.arrivalTime,
        stopsCount: form.transport === 'train' && form.stopsCount !== '' ? Number(form.stopsCount) : null,
        travelNumber: form.travelNumber.trim(), terminal: form.terminal.trim(), platform: form.platform.trim(),
        ticketName,
        ticketBlob,
      })
      onUnsavedChange?.(false)
      navigate('/')
    } catch {
      setSaveError('Не удалось сохранить поездку в браузере. Проверьте свободное место и повторите попытку.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page add-page">
      <header className="page-header compact-header">
        <h1>{isEdit ? 'Редактировать поездку' : 'Добавить билет'}</h1>
        <p className="page-intro">
          {isEdit ? 'Изменённые поля подсвечиваются зелёным' : 'Загрузите PDF и заполните маршрут'}
        </p>
      </header>

      <form className={`trip-form ${isEdit ? 'edit-form' : ''}`} onSubmit={handleSubmit} noValidate>
        <fieldset className={`transport-picker ${changedFields.has('transport') ? 'transport-changed' : ''}`}>
          <legend>
            Вид транспорта
            {changedFields.has('transport') && <span className="changed-label">Изменено</span>}
          </legend>
          <RadioCards.Root
            className="transport-options"
            columns="3"
            gap="2"
            value={form.transport}
            onValueChange={updateTransport}
            color="blue"
            size="2"
          >
            {Object.entries(TRANSPORTS).map(([value, transport]) => (
              <RadioCards.Item className="transport-option" key={value} value={value}>
                <Icon name={transport.icon} />
                <span>{transport.label}</span>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        </fieldset>

        <div className="field-group">
          <label htmlFor="ticket">
            PDF-билет
            {changedFields.has('ticket') && <span className="changed-label">Изменено</span>}
          </label>
          <Button
            className={`file-drop ${errors.ticket ? 'field-invalid' : ''} ${changedFields.has('ticket') ? 'field-changed' : ''}`}
            type="button"
            variant="soft"
            radius="large"
            onClick={() => ticketInputRef.current?.click()}
          >
            <span className="file-icon" aria-hidden="true"><Icon name="upload" /></span>
            <span className="file-copy">
              <strong>{form.ticket?.name ?? initialTrip?.ticketName ?? 'Выберите PDF-файл'}</strong>
              <small>{form.ticket || initialTrip ? 'Нажмите, чтобы заменить' : 'До 10 МБ'}</small>
            </span>
          </Button>
          <input
            className="visually-hidden"
            id="ticket"
            name="ticket"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleTicketChange}
            ref={ticketInputRef}
            aria-describedby={errors.ticket ? 'ticket-error' : undefined}
          />
          {errors.ticket && <p className="error-message" id="ticket-error">{errors.ticket}</p>}
          {scanState.status === 'scanning' && (
            <div className="scan-status" role="status">
              <span className="scan-spinner" aria-hidden="true" />
              <p><strong>Считываем текст билета…</strong><small>PDF остаётся в вашем браузере.</small></p>
            </div>
          )}
          {scanState.status === 'ready' && (
            <div className="scan-review" role="status">
              <div>
                <strong>Нашли данные в билете</strong>
                <p>Проверьте их перед заполнением — распознавание может ошибаться.</p>
              </div>
              <ul>{scanState.detected.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="scan-actions">
                <Button type="button" onClick={applyScannedFields}>Подставить данные</Button>
                <Button type="button" color="gray" variant="soft" onClick={() => setScanState({ status: 'idle', detected: [], fields: {} })}>Заполнить вручную</Button>
              </div>
            </div>
          )}
          {scanState.status === 'applied' && (
            <div className="scan-applied" role="status">
              <strong>Данные подставлены.</strong> Сверьте маршрут, дату и время с PDF.
            </div>
          )}
          {(scanState.status === 'empty' || scanState.status === 'failed') && (
            <div className="scan-manual" role="status">
              <strong>Не удалось надёжно прочитать билет.</strong> Заполните поля вручную — PDF уже прикреплён.
              {scanState.status === 'failed' && <Button type="button" color="gray" variant="soft" onClick={() => scanTicket(form.ticket)}>Повторить распознавание</Button>}
            </div>
          )}
        </div>

        <LocationFields
          title="Отправление"
          prefix="origin"
          form={form}
          errors={errors}
          transport={form.transport}
          onChange={updateField}
          onSelectPlace={selectPlace}
          changedFields={changedFields}
        />
        <LocationFields
          title="Прибытие"
          prefix="destination"
          form={form}
          errors={errors}
          transport={form.transport}
          onChange={updateField}
          onSelectPlace={selectPlace}
          changedFields={changedFields}
        />

        <section className="schedule-section" aria-labelledby="departure-time-title">
          <div className="section-heading">
            <span className="section-number" aria-hidden="true"><Icon name="clock" size={15} /></span>
            <h2 id="departure-time-title">Время поездки</h2>
          </div>
          <div className="schedule-warning" role="note">
            <Icon name="clock" size={19} />
            <p>
              <strong>Проверьте время по билету.</strong>
              {' '}Приложение считает длительность по введённым дате и времени и не сверяет расписание и часовые пояса.
            </p>
          </div>

          <h3>Отправление</h3>
          <div className="field-row date-row">
            <MobilePickerField label="Дата отправления" name="date" type="date" value={form.date} error={errors.date} onChange={updateDateTime} changed={changedFields.has('date')} />
            <MobilePickerField label="Время отправления по билету" name="time" type="time" value={form.time} error={errors.time} onChange={updateDateTime} changed={changedFields.has('time')} />
          </div>

          <h3>Прибытие</h3>
          <div className="field-row date-row">
            <MobilePickerField label="Дата прибытия" name="arrivalDate" type="date" value={form.arrivalDate} error={errors.arrivalDate} onChange={updateDateTime} optional changed={changedFields.has('arrivalDate')} />
            <MobilePickerField label="Время прибытия по билету" name="arrivalTime" type="time" value={form.arrivalTime} error={errors.arrivalTime} onChange={updateDateTime} optional changed={changedFields.has('arrivalTime')} />
          </div>
          {form.transport === 'train' && (
            <div className="train-stops-field">
              <Field
                label="Промежуточные остановки"
                name="stopsCount"
                value={form.stopsCount}
                error={errors.stopsCount}
                changed={changedFields.has('stopsCount')}
                onChange={updateField}
                placeholder="Например, 8"
                type="number"
                min="0"
                max="99"
                inputMode="numeric"
                optional
              />
              <p>Не считая станции отправления и прибытия.</p>
              {stopsLookup === 'loading' && <p className="route-lookup-status">Считаем остановки по маршруту…</p>}
              {stopsLookup === 'ready' && <p className="route-lookup-status">Количество остановок получено из маршрута. Его можно изменить вручную.</p>}
              {stopsLookup === 'not-configured' && <p className="route-lookup-status">Сервис маршрутов запросил ключ. Укажите число вручную.</p>}
              {stopsLookup === 'not-found' && <p className="route-lookup-status">Маршрут не найден. Укажите число вручную.</p>}
              {stopsLookup === 'failed' && <p className="route-lookup-status">Не удалось получить маршрут. Укажите число вручную.</p>}
            </div>
          )}
          <div className="field-row">
            <Field label={form.transport === 'plane' ? 'Номер рейса' : form.transport === 'bus' ? 'Номер автобуса' : 'Номер поезда'} name="travelNumber" value={form.travelNumber} error={errors.travelNumber} changed={changedFields.has('travelNumber')} onChange={updateField} optional />
            <Field label={form.transport === 'plane' ? 'Терминал' : form.transport === 'bus' ? 'Место посадки' : 'Платформа или путь'} name={form.transport === 'plane' ? 'terminal' : 'platform'} value={form.transport === 'plane' ? form.terminal : form.platform} error={undefined} changed={changedFields.has(form.transport === 'plane' ? 'terminal' : 'platform')} onChange={updateField} optional />
          </div>
          {durationPreview && (
            <p className="duration-preview"><Icon name="clock" size={17} />Расчётное время в пути: {durationPreview}</p>
          )}
        </section>

        <div className="form-actions">
          {saveError && <p className="form-save-error" role="alert">{saveError}</p>}
          {isEdit && <Button type="button" color="gray" variant="soft" onClick={() => {
            if (onRequestNavigation) onRequestNavigation(() => navigate('/'), hasChanges)
            else navigate('/')
          }}>Отмена</Button>}
          <Button
            className="primary-button submit-button"
            type="submit"
            radius="large"
            size="3"
            disabled={isSaving || (isEdit && changedFields.size === 0)}
          >
            <Icon name={isEdit ? 'edit' : 'plus'} size={19} />
            {isSaving
              ? 'Сохраняем…'
              : saveError
                ? 'Повторить сохранение'
                : isEdit
                  ? 'Сохранить изменения'
                  : 'Добавить поездку'}
          </Button>
        </div>
      </form>
    </main>
  )
}

function EditTripPage({ trips, onUpdateTrip, onUnsavedChange, onRequestNavigation }) {
  const { tripId } = useParams()
  const trip = trips.find((item) => item.id === tripId)

  if (!trip) return <Navigate to="/" replace />

  return <TripFormPage key={trip.id} mode="edit" initialTrip={trip} onSave={onUpdateTrip} onUnsavedChange={onUnsavedChange} onRequestNavigation={onRequestNavigation} />
}

function BottomNavigation({ onRequestNavigation }) {
  const navigate = useNavigate()
  const location = useLocation()
  function guardNavigation(destination) {
    if (location.pathname === destination) return
    onRequestNavigation(() => navigate(destination))
  }

  return (
    <nav className="bottom-navigation" aria-label="Основная навигация">
      <button className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} type="button" onClick={() => guardNavigation('/')}>
        <span className="nav-icon" aria-hidden="true"><Icon name="ticket" /></span>
        <span>Поездки</span>
      </button>
      <button className={`nav-item ${location.pathname === '/add' ? 'active' : ''}`} type="button" onClick={() => guardNavigation('/add')}>
        <span className="nav-icon" aria-hidden="true"><Icon name="plus" size={25} /></span>
        <span>Добавить</span>
      </button>
    </nav>
  )
}

function TripsApp({ onLogout }) {
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const tripsRef = useRef(trips)

  useEffect(() => {
    tripsRef.current = trips
  }, [trips])

  useEffect(() => {
    let cancelled = false

    loadTrips()
      .then((storedTrips) => {
        if (cancelled) return
        setTrips(storedTrips.map((trip) => ({
          ...trip,
          ticketUrl: URL.createObjectURL(trip.ticketBlob),
        })))
      })
      .catch(() => {
        if (!cancelled) setStorageError('Браузер не дал доступ к локальному хранилищу IndexedDB.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      tripsRef.current.forEach((trip) => URL.revokeObjectURL(trip.ticketUrl))
    }
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined
    const warnBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges])

  function requestNavigation(action, forceConfirmation = false) {
    if (!forceConfirmation && !hasUnsavedFormChanges) {
      action()
      return
    }
    setPendingNavigation(() => action)
  }

  function confirmNavigation() {
    const action = pendingNavigation
    setPendingNavigation(null)
    setUnsavedChanges(false)
    action?.()
  }

  function setUnsavedChanges(value) {
    hasUnsavedFormChanges = value
    setHasUnsavedChanges(value)
  }

  async function addTrip(newTrip) {
    await saveTrip(newTrip)
    setTrips((items) => [...items, { ...newTrip, ticketUrl: URL.createObjectURL(newTrip.ticketBlob) }])
  }

  async function updateTrip(updatedTrip) {
    await saveTrip(updatedTrip)
    setTrips((items) => items.map((trip) => {
      if (trip.id !== updatedTrip.id) return trip
      URL.revokeObjectURL(trip.ticketUrl)
      return { ...updatedTrip, ticketUrl: URL.createObjectURL(updatedTrip.ticketBlob) }
    }))
  }

  async function deleteTrip(tripId) {
    try {
      await removeTrip(tripId)
    } catch {
      setStorageError('Не удалось удалить поездку из IndexedDB.')
      return
    }
    setTrips((items) => {
      const removedTrip = items.find((trip) => trip.id === tripId)
      if (removedTrip) URL.revokeObjectURL(removedTrip.ticketUrl)
      return items.filter((trip) => trip.id !== tripId)
    })
  }

  if (isLoading) {
    return <main className="app-loading" aria-live="polite">Открываем ваши поездки…</main>
  }

  return (
    <div className="app-shell">
      {storageError && <div className="storage-error" role="alert">{storageError}</div>}
      <Routes>
        <Route path="/" element={<TripsPage trips={trips} onDeleteTrip={deleteTrip} onLogout={onLogout} />} />
        <Route path="/add" element={<TripFormPage onSave={addTrip} onUnsavedChange={setUnsavedChanges} onRequestNavigation={requestNavigation} />} />
        <Route path="/edit/:tripId" element={<EditTripPage trips={trips} onUpdateTrip={updateTrip} onUnsavedChange={setUnsavedChanges} onRequestNavigation={requestNavigation} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AlertDialog.Root open={Boolean(pendingNavigation)} onOpenChange={(open) => !open && setPendingNavigation(null)}>
        <AlertDialog.Content className="delete-dialog" maxWidth="420px">
          <AlertDialog.Title>Не сохранять изменения?</AlertDialog.Title>
          <AlertDialog.Description>Введённые данные не попадут в список поездок.</AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel><Button color="gray" variant="soft">Остаться</Button></AlertDialog.Cancel>
            <AlertDialog.Action><Button color="red" onClick={confirmNavigation}>Не сохранять</Button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Root>
      <BottomNavigation onRequestNavigation={requestNavigation} />
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const nextErrors = validateDemoCredentials(email, password)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})
    try {
      await saveAuth()
      onLogin()
    } catch {
      setErrors({ form: 'Не удалось сохранить вход в браузере. Повторите попытку.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true"><Icon name="ticket" size={30} /></div>
        <p className="login-brand">впути</p>
        <h1 id="login-title">Войти</h1>
        <p className="login-intro">Демонстрационный вход имитирует авторизацию и не защищает данные.</p>
        <div className="demo-credentials" aria-label="Тестовые данные для входа">
          <span>Почта: <code>{DEMO_EMAIL}</code></span>
          <span>Пароль: <code>{DEMO_PASSWORD}</code></span>
        </div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="login-email">Почта</label>
            <TextField.Root id="login-email" name="email" type="email" autoComplete="username" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined}>
              <TextField.Slot><Icon name="mail" size={18} /></TextField.Slot>
            </TextField.Root>
            {errors.email && <p className="login-error" id="login-email-error">{errors.email}</p>}
          </div>
          <div className="field-group">
            <label htmlFor="login-password">Пароль</label>
            <TextField.Root id="login-password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined}>
              <TextField.Slot><Icon name="lock" size={18} /></TextField.Slot>
            </TextField.Root>
            {errors.password && <p className="login-error" id="login-password-error">{errors.password}</p>}
          </div>
          {errors.form && <p className="login-error" role="alert">{errors.form}</p>}
          <Button className="primary-button login-button" type="submit" size="3" disabled={isSubmitting}>
            {isSubmitting ? 'Входим…' : 'Войти'}
          </Button>
          <p className="login-privacy">В IndexedDB сохраняется только признак входа — без почты и пароля.</p>
        </form>
      </section>
    </main>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadAuth()
      .then((authenticated) => {
        if (!cancelled) setIsAuthenticated(authenticated)
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false)
      })
    return () => { cancelled = true }
  }, [])

  async function handleLogout() {
    await clearAuth()
    setIsAuthenticated(false)
  }

  if (isAuthenticated === null) {
    return <main className="app-loading" aria-live="polite">Открываем приложение…</main>
  }

  return isAuthenticated
    ? <TripsApp onLogout={handleLogout} />
    : <LoginPage onLogin={() => setIsAuthenticated(true)} />
}
