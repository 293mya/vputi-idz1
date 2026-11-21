const MONTHS = {
  января: '01',
  февраля: '02',
  марта: '03',
  апреля: '04',
  мая: '05',
  июня: '06',
  июля: '07',
  августа: '08',
  сентября: '09',
  октября: '10',
  ноября: '11',
  декабря: '12',
}

const AIRPORTS = {
  BCN: { city: 'Барселона', place: 'Аэропорт Эль-Прат, BCN', address: '08820 Эль-Прат-де-Льобрегат' },
  GRO: { city: 'Барселона', place: 'Аэропорт Жирона — Коста-Брава, GRO', address: '17185 Вилоби-д’Оньяр' },
  REU: { city: 'Барселона', place: 'Аэропорт Реус, REU', address: '43204 Реус' },
  LHR: { city: 'Лондон', place: 'Аэропорт Хитроу, LHR', address: 'Hounslow, TW6' },
  LGW: { city: 'Лондон', place: 'Аэропорт Гатвик, LGW', address: 'Horley, RH6' },
  STN: { city: 'Лондон', place: 'Аэропорт Станстед, STN', address: 'Bassingbourn Road' },
  LTN: { city: 'Лондон', place: 'Аэропорт Лутон, LTN', address: 'Airport Way, Luton' },
  BRU: { city: 'Брюссель', place: 'Аэропорт Брюсселя, BRU', address: 'Leopoldlaan, Zaventem' },
  CRL: { city: 'Брюссель', place: 'Аэропорт Шарлеруа, CRL', address: 'Rue des Fusillés, Charleroi' },
  MAD: { city: 'Мадрид', place: 'Аэропорт Барахас, MAD', address: 'Avenida de la Hispanidad' },
  AMS: { city: 'Амстердам', place: 'Аэропорт Схипхол, AMS', address: 'Evert van de Beekstraat 202' },
}

function toIsoDate(day, monthName, year) {
  const month = MONTHS[monthName.toLocaleLowerCase('ru-RU')]
  return month ? `${year}-${month}-${String(day).padStart(2, '0')}` : ''
}

export function parseTicketText(text) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const fields = {}
  const detected = []

  const codes = [...normalized.matchAll(/\b[A-Z]{3}\b/g)]
    .map((match) => match[0])
    .filter((code, index, items) => AIRPORTS[code] && items.indexOf(code) === index)

  if (codes.length >= 2) {
    const origin = AIRPORTS[codes[0]]
    const destination = AIRPORTS[codes[1]]
    Object.assign(fields, {
      transport: 'plane',
      originCity: origin.city,
      originPlace: origin.place,
      originAddress: origin.address,
      destinationCity: destination.city,
      destinationPlace: destination.place,
      destinationAddress: destination.address,
    })
    detected.push(`Маршрут: ${origin.city} — ${destination.city}`)
  }

  const dateMatch = normalized.match(/\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(20\d{2})\b/i)
  if (dateMatch) {
    fields.date = toIsoDate(dateMatch[1], dateMatch[2], dateMatch[3])
    detected.push(`Дата отправления: ${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`)
  }

  const departureMatch = normalized.match(/(?:ВЫЛЕТ|ОТПРАВЛЕНИЕ|DEPARTURE)\s*(\d{1,2}:\d{2})/i)
  if (departureMatch) {
    fields.time = departureMatch[1].padStart(5, '0')
    detected.push(`Время отправления: ${fields.time}`)
  }

  const flightMatch = normalized.match(/(?:РЕЙС|FLIGHT)\s*([A-Z]{2}\s?\d{1,4})/i)
  const trainMatch = normalized.match(/(?:ПОЕЗД|TRAIN)\s*(\d{1,5})/i)
  const terminalMatch = normalized.match(/(?:ТЕРМИНАЛ|TERMINAL)\s*([A-ZА-Я0-9-]+)/i)
  const platformMatch = normalized.match(/(?:ПЛАТФОРМА|ПУТЬ|PLATFORM|TRACK)\s*([A-ZА-Я0-9-]+)/i)
  if (flightMatch) { fields.travelNumber = flightMatch[1].replace(/\s/g, ''); detected.push(`Рейс: ${fields.travelNumber}`) }
  if (trainMatch) { fields.travelNumber = trainMatch[1]; detected.push(`Поезд: ${fields.travelNumber}`) }
  if (terminalMatch) { fields.terminal = terminalMatch[1]; detected.push(`Терминал: ${fields.terminal}`) }
  if (platformMatch) { fields.platform = platformMatch[1]; detected.push(`Платформа: ${fields.platform}`) }

  return {
    fields,
    detected,
    hasUsefulData: Object.keys(fields).length > 0,
  }
}

export async function scanTicketPdf(file) {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = workerModule.default

  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise
  const pageTexts = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pageTexts.push(content.items.map((item) => item.str).join(' '))
  }
  let text = pageTexts.join(' ')
  if (!text.trim()) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('rus+eng')
    try {
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      text = (await worker.recognize(canvas)).data.text
    } finally {
      await worker.terminate()
    }
  }

  return parseTicketText(text)
}
