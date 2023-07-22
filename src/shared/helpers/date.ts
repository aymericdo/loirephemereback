import { DateTime } from 'luxon';

const TIMEZONE = 'Europe/Paris';

export const formatYYYYMMDD = (date: Date, separator = '/'): string => {
  const year = date.getFullYear();

  let month = (1 + date.getMonth()).toString();
  month = month.length > 1 ? month : '0' + month;

  let day = date.getDate().toString();
  day = day.length > 1 ? day : '0' + day;

  return `${year}${separator}${month}${separator}${day}`;
};

export const nowInTimezone = (): Date => {
  const dateTime = DateTime.now();
  return new Date(dateTime.toISO());
};

export const hourMinuteToDate = (hour: string, minute: string): Date => {
  const dateTime = DateTime.fromObject(
    { hour: +hour, minute: +minute },
    { zone: TIMEZONE },
  );

  console.log(dateTime);
  console.log(dateTime.toISO());
  console.log(dateTime.toString());

  return new Date(dateTime.toString());
};

export const getCwday = (): number => {
  const today = new Date();
  const currentDay = today.getDay();
  return (currentDay - 1 + 7) % 7;
};
