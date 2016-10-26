'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TIME_REG = /(([А-Я][А-Я]) )?(\d\d):(\d\d)\+(\d+)/;
var DEADLINE = 24 * 60 * 3;
var daysInWeek = { 'ПН': 0, 'ВТ': 1, 'СР': 2, 'ЧТ': 3, 'ПТ': 4, 'СБ': 5, 'ВС': 6 };
var bankWorkingDays = ['ПН', 'ВТ', 'СР'];

function getTimeInMinute(time, baseTimeZone) {
    var parsedTime = TIME_REG.exec(time);
    var hour = parseInt(parsedTime[3], 10);
    var minute = parseInt(parsedTime[4], 10);
    var timeZone = baseTimeZone - parseInt(parsedTime[5], 10);
    var timeInMinute = minute + hour * 60 + timeZone * 60;
    if (daysInWeek.hasOwnProperty(parsedTime[2])) {
        timeInMinute += (daysInWeek[parsedTime[2]]) * 24 * 60;
    }

    return timeInMinute;
}

function formatScheduleRecord(bankTimeZone) {
    return function (schedule) {
        return {
            from: getTimeInMinute(schedule.from, bankTimeZone),
            to: getTimeInMinute(schedule.to, bankTimeZone)
        };
    };
}

function concatFreeTime(newSchedule, duration) {
    return function (freeTimeStart, currentBusyTime) {
        if (currentBusyTime.from >= freeTimeStart + duration) {
            newSchedule.push({ from: freeTimeStart, to: currentBusyTime.from });

            return currentBusyTime.to;
        }
        freeTimeStart = Math.max(freeTimeStart, currentBusyTime.to);

        return freeTimeStart;
    };
}

function getGangFreeSchedule(gangSchedule, bankTimeZone, duration) {
    var formattedSchedule = Object
        .keys(gangSchedule)
        .reduce(getFormattedRobberSchedule(gangSchedule, bankTimeZone), {});
    var busyTime = Object.keys(formattedSchedule)
        .reduce(concatSchedule(formattedSchedule), [])
        .sort(compareScheduleRecords);
    var freeTime = [];
    var finish = busyTime.reduce(concatFreeTime(freeTime, duration), 0);
    if (finish + duration <= DEADLINE) {
        freeTime.push({ from: finish, to: DEADLINE });
    }

    return freeTime;
}

function getFormattedRobberSchedule(schedule, bankTimeZone) {
    return function (formatSchedule, robber) {
        formatSchedule[robber] = schedule[robber].map(formatScheduleRecord(bankTimeZone));

        return formatSchedule;
    };
}

function compareScheduleRecords(rec1, rec2) {
    return rec1.from - rec2.from;
}

function concatSchedule(gang) {
    return function (acc, robber) {
        return acc.concat(gang[robber]);
    };
}

function getBankScheduleForWeek(workingHours) {
    return function (weekDay) {
        return {
            from: weekDay + ' ' + workingHours.from,
            to: weekDay + ' ' + workingHours.to
        };
    };
}

function formatBankSchedule(workingHours, timeZone) {
    var weekWorkingHours = bankWorkingDays.map(getBankScheduleForWeek(workingHours));

    return weekWorkingHours.map(formatScheduleRecord(timeZone));
}

function findStartRobbingTime(sortedSchedule, duration, robbingStartTime) {
    var robbingEndTime = robbingStartTime;
    for (var i = 0; i < sortedSchedule.length; i++) {
        var robberStartTime = sortedSchedule[i].from;
        var robberStopTime = sortedSchedule[i].to;
        var timeToStop = Math.min(robberStopTime, robbingEndTime);
        if (robberStartTime + duration <= timeToStop) {
            return robberStartTime;
        }
        robbingEndTime = Math.max(robberStopTime, robbingEndTime);
    }

    return null;
}

function filterByStartTime(startTime) {
    return function (time) {
        if (time.from < startTime && time.to > startTime) {
            time.from = startTime;
        }

        return time.from >= startTime;
    };
}

function getAppropriateSchedule(schedule, duration, workingHours) {
    var bankTimeZone = parseInt(TIME_REG.exec(workingHours.from)[5], 10);
    var freeGangTime = getGangFreeSchedule(schedule, bankTimeZone, duration);
    var bankSchedule = formatBankSchedule(workingHours, bankTimeZone);

    return bankSchedule.concat(freeGangTime);
}

function getTheMoment(schedule, startRobbingTime, duration) {
    var sortedSchedule = schedule
        .filter(filterByStartTime(startRobbingTime))
        .sort(compareScheduleRecords);

    return findStartRobbingTime(sortedSchedule, duration, startRobbingTime);
}

function getCountOfDuration(timeInMinute, duration) {
    var count = 0;
    while (Math.floor(timeInMinute / duration) !== 0) {
        count++;
        timeInMinute -= duration;
    }

    return count;
}

function getFormatNumber(number) {
    if (number < 10) {
        return '0' + number;
    }

    return number.toString();
}

function getFormatTimeFromMinute(timeInMinute, template) {
    if (!timeInMinute && timeInMinute !== 0) {
        return '';
    }
    var dayDuration = 60 * 24;
    var hourDuration = 60;
    var dayCount = getCountOfDuration(timeInMinute, dayDuration);
    if (dayCount) {
        timeInMinute -= dayDuration * dayCount;
    }
    var hourCount = getCountOfDuration(timeInMinute, hourDuration);
    var minuteCount = timeInMinute;
    if (hourCount) {
        minuteCount -= hourDuration * hourCount;
    }

    return template
        .replace(/%DD/g, bankWorkingDays[dayCount])
        .replace(/%HH/g, getFormatNumber(hourCount))
        .replace(/%MM/g, getFormatNumber(minuteCount));
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);
    var formatSchedule = getAppropriateSchedule(schedule, duration, workingHours);
    var moment = getTheMoment(formatSchedule, 0, duration);
    var exist = moment !== null;
    var robbingTime = moment || 0;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return exist;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            return getFormatTimeFromMinute(moment, template);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            robbingTime += 30;
            var newMoment = getTheMoment(formatSchedule, robbingTime, duration);
            if (newMoment) {
                moment = newMoment;
                robbingTime = newMoment;
            }

            return newMoment !== null;
        }
    };
};
