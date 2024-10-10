import { Restaurant } from "src/restaurants/schemas/restaurant.schema";
import { getCwday, getYesterday, hourMinuteToDate } from "src/shared/helpers/date";

interface OpeningHours {
  start: Date | null;
  end: Date | null;
  isOnTwoDay?: boolean;
}

export const getTodayOpeningTimes = (restaurant: Restaurant): OpeningHours => {
  const cwday = getCwday();

  if (
    restaurant.openingTime &&
    restaurant.openingTime[cwday] &&
    restaurant.openingTime[cwday].startTime
  ) {
    const openingHoursMinutes = restaurant.openingTime[cwday].startTime.split(':');
    const closingHoursMinutes = restaurant.openingTime[cwday].endTime.split(':');

    const start = hourMinuteToDate(openingHoursMinutes[0], openingHoursMinutes[1]);
    const end = hourMinuteToDate(closingHoursMinutes[0], closingHoursMinutes[1]);
    let isOnTwoDay = false;

    if (start >= end) {
      end.setDate(end.getDate() + 1);
      isOnTwoDay = true;
    }

    return { start, end, isOnTwoDay };
  }

  return { start: null, end: null };
};

export const getYesterdayOpeningTimes = (restaurant: Restaurant): OpeningHours => {
  const yesterday = getYesterday();

  if (
    restaurant.openingTime &&
    restaurant.openingTime[yesterday] &&
    restaurant.openingTime[yesterday].startTime
  ) {
    const openingHoursMinutes = restaurant.openingTime[yesterday].startTime.split(':');
    const closingHoursMinutes = restaurant.openingTime[yesterday].endTime.split(':');

    const start = hourMinuteToDate(openingHoursMinutes[0], openingHoursMinutes[1]);
    const end = hourMinuteToDate(closingHoursMinutes[0], closingHoursMinutes[1]);

    let isOnTwoDay = false;

    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);

    if (start >= end) {
      end.setDate(end.getDate() + 1);
      isOnTwoDay = true;
    }

    return { start, end, isOnTwoDay };
  }

  return { start: null, end: null };
};

export const isOpen = (restaurant: Restaurant, date = new Date()): boolean => {
  if (restaurant.alwaysOpen) {
    return true;
  }

  const now = new Date(date.getTime());

  const { start: startTime, end: endTime } = getTodayOpeningTimes(restaurant);
  const { start: yesterdayStartTime, end: yesterdayEndTime } = getYesterdayOpeningTimes(restaurant);

  return !!(startTime && endTime && startTime < now && now < endTime) ||
    !!(yesterdayStartTime && yesterdayEndTime && yesterdayStartTime < now && now < yesterdayEndTime);
};

export const isPickupOpen = (restaurant: Restaurant): boolean => {
  if (restaurant.alwaysOpen) return true;
  if (isOpen(restaurant)) return true;

  const now = new Date();
  const cwday = getCwday();

  if (
    restaurant.openingPickupTime &&
    restaurant.openingPickupTime[cwday] &&
    restaurant.openingPickupTime[cwday].startTime
  ) {
    const openingPickupHoursMinutes = restaurant.openingPickupTime[cwday].startTime.split(':');
    const startTime = hourMinuteToDate(openingPickupHoursMinutes[0], openingPickupHoursMinutes[1]);

    return !!(startTime && now >= startTime);
  }

  return false;
};
