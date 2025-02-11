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

export const hourMinuteToDate = (hour: string, minute: string, timezone: string | undefined): Date => {
  const dateTime = DateTime.fromObject(
    { hour: +hour, minute: +minute },
    { zone: timezone || TIMEZONE },
  );

  return new Date(dateTime.toString());
};

export const getCwday = (): number => {
  const today = new Date();
  const currentDay = today.getDay();
  return (currentDay - 1 + 7) % 7;
};

export const getYesterday = (): number => {
  return ((getCwday() - 1 + 7) % 7);
};

export const getBeginningOfDay = (day: Date): Date => {
  const beginningOfToday = new Date(day.getTime());
  beginningOfToday.setUTCHours(0, 0, 0, 0);
  return beginningOfToday;
};

export const addHours = (date: Date, hours: number): Date => {
  const hoursToAdd = hours * 60 * 60 * 1000;
  const newDate = new Date(date.getTime());
  newDate.setTime(newDate.getTime() + hoursToAdd);
  return newDate;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const minutesToAdd = minutes * 60 * 1000;
  const newDate = new Date(date.getTime());
  newDate.setTime(newDate.getTime() + minutesToAdd);
  return newDate;
};

export const getNumberListBetweenTwoNumbers = (h1: number, h2: number): number[] => {
  const list = [];
  for (let i = h1; i <= h2; i++) {
    list.push(i);
  }

  return list;
};
