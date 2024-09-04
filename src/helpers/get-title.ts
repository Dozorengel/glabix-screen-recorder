export function getTitle() {
  // Создаем объект текущей даты и времени
  const currentDate = new Date()

  // Определяем массив с именами месяцев на русском языке
  const monthNames = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ]

  // Получаем день, месяц, год, часы и минуты
  const day = currentDate.getDate()
  const month = monthNames[currentDate.getMonth()]
  const year = currentDate.getFullYear()
  const hours = currentDate.getHours()
  const minutes = currentDate.getMinutes()

  // Добавляем ведущий ноль к минутам, если это необходимо
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes

  // Форматируем дату и время
  const formattedDateTime = `${day} ${month} ${year}, ${hours}:${formattedMinutes}`
  const prefix = "Экран — "
  return prefix + formattedDateTime
}
