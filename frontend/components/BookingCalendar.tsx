"use client";

import { useMemo, useState } from "react";

const slots = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"];

export function getNairobiToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getFirstBookableDate(): string {
  let day = parseDate(getNairobiToday());
  while (day.getUTCDay() === 0) day = addDays(day, 1);
  return toDateKey(day);
}

export function getFirstAvailableTime(date: string): string {
  const available = slots.find((slot) => {
    const slotDate = new Date(`${date}T${to24Hour(slot)}:00+03:00`);
    return !Number.isNaN(slotDate.getTime()) && slotDate.getTime() >= Date.now() + 60_000;
  });
  return available ?? slots[0];
}

export default function BookingCalendar({ date, time, onDateChange, onTimeChange }: {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}) {
  const today = getNairobiToday();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(parseDate(date)));
  const days = useMemo(() => {
    const result = [];
    for (let offset = 0; result.length < 6 && offset < 7; offset++) {
      const day = addDays(weekStart, offset);
      if (day.getUTCDay() !== 0 && toDateKey(day) >= today) {
        result.push(day);
      }
    }
    return result;
  }, [weekStart, today]);

  const currentWeekStart = startOfWeek(parseDate(today));
  const canGoBack = weekStart > currentWeekStart;

  function changeWeek(amount: number) {
    const next = addDays(weekStart, amount * 7);
    if (next < currentWeekStart) return;
    setWeekStart(next);
    const nextAvailable = Array.from({ length: 7 }, (_, offset) => addDays(next, offset))
      .find((day) => day.getUTCDay() !== 0 && toDateKey(day) >= today);
    if (nextAvailable) onDateChange(toDateKey(nextAvailable));
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(days[0] ?? weekStart);

  return (
    <div className="calendar">
      <div className="calendar-month"><strong>{monthLabel}</strong><div>
        <button type="button" aria-label="Previous week" disabled={!canGoBack} onClick={() => changeWeek(-1)}>‹</button>
        <button type="button" aria-label="Next week" onClick={() => changeWeek(1)}>›</button>
      </div></div>
      <div className="date-list">
        {days.map((day) => {
          const key = toDateKey(day);
          const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(day).toUpperCase();
          return <button key={key} type="button" className={`date-option${date === key ? " active" : ""}`} onClick={() => onDateChange(key)}>
            <small>{weekday}</small><strong>{day.getUTCDate()}</strong>
          </button>;
        })}
      </div>
      <p className="field-label">AVAILABLE TIMES</p>
      <div className="time-list">
        {slots.map((slot) => {
          const slotDate = new Date(`${date}T${to24Hour(slot)}:00+03:00`);
          const unavailable = Number.isNaN(slotDate.getTime()) || slotDate.getTime() < Date.now() + 60_000;
          return <button type="button" key={slot} disabled={unavailable} onClick={() => onTimeChange(slot)} className={`time-option${time === slot ? " active" : ""}`}>{slot}</button>;
        })}
      </div>
    </div>
  );
}

function parseDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(day: Date): string {
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
}

function addDays(day: Date, amount: number): Date {
  const result = new Date(day);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function startOfWeek(day: Date): Date {
  const mondayOffset = (day.getUTCDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

function to24Hour(slot: string): string {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(slot);
  if (!match) return "00:00";
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
