export const formatYYYYMMDD = (date: Date, separator = '/'): string => {
  const year = date.getFullYear();

  let month = (1 + date.getMonth()).toString();
  month = month.length > 1 ? month : '0' + month;

  let day = date.getDate().toString();
  day = day.length > 1 ? day : '0' + day;

  return `${year}${separator}${month}${separator}${day}`;
};

export const hourMinuteToDate = (
  hour: string,
  minute: string,
  timezone = '+01:00',
): Date => {
  const YYYYMMDD = formatYYYYMMDD(new Date(), '-');

  return new Date(`${YYYYMMDD}T${hour}:${minute}:00${timezone}`);
};

export const getCwday = (): number => {
  const today = new Date();
  const currentDay = today.getDay();
  return (currentDay - 1 + 7) % 7;
};
