'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */

exports.isStar = true;

var MINUTES_IN_HOUR = 60;
var HOURS_IN_DAY = 24;
var TIME_REG = /(([А-Я][А-Я]) )?(\d\d):(\d\d)\+(\d+)/;

var weekInfo = [
    { name: 'ПН', isWorking: true },
    { name: 'ВТ', isWorking: true },
    { name: 'СР', isWorking: true },
    { name: 'ЧТ', isWorking: false },
    { name: 'ПТ', isWorking: false },
    { name: 'СБ', isWorking: false },
    { name: 'ВС', isWorking: false }
];

var deadLine = weekInfo.reduce(function (acc, dayInfo) {
    if (dayInfo.isWorking) {
        acc += HOURS_IN_DAY * MINUTES_IN_HOUR;
    }

    return acc;
}, 0);

function getParsedTime(time) {
    var regResult = TIME_REG.exec(time);

    return {
        day: regResult[2],
        hour: parseInt(regResult[3], 10),
        minute: parseInt(regResult[4], 10),
        timeZone: parseInt(regResult[5], 10)
    };
}

function getTimeInMinute(time, baseTimeZone) {
    var parsedTime = getParsedTime(time);
    var diffTimeZones = baseTimeZone - parsedTime.timeZone;
    var dayNumber = weekInfo.map(function (dayInfo) {
        return dayInfo.name;
    }).indexOf(parsedTime.day);

    return parsedTime.minute +
         parsedTime.hour * MINUTES_IN_HOUR +
         diffTimeZones * MINUTES_IN_HOUR +
         dayNumber * HOURS_IN_DAY * MINUTES_IN_HOUR;
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
    var formattedSchedule = Object.keys(gangSchedule)
        .reduce(getFormattedRobberSchedule(gangSchedule, bankTimeZone), {});
    var busyTime = Object.keys(formattedSchedule)
        .reduce(concatSchedule(formattedSchedule), [])
        .sort(compareScheduleRecords);
    var freeTime = [];
    var finish = busyTime.reduce(concatFreeTime(freeTime, duration), 0);
    if (finish + duration <= deadLine) {
        freeTime.push({ from: finish, to: deadLine });
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
    return function (bankSchedule, dayInfo) {
        if (dayInfo.isWorking) {
            bankSchedule.push({
                from: dayInfo.name + ' ' + workingHours.from,
                to: dayInfo.name + ' ' + workingHours.to
            });
        }

        return bankSchedule;
    };
}

function formatBankSchedule(workingHours, timeZone) {
    var weekWorkingHours = weekInfo.reduce(getBankScheduleForWeek(workingHours), []);

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
    var minutesInDay = HOURS_IN_DAY * MINUTES_IN_HOUR;
    var daysCount = getCountOfDuration(timeInMinute, minutesInDay);
    if (daysCount) {
        timeInMinute -= minutesInDay * daysCount;
    }
    var hoursCount = getCountOfDuration(timeInMinute, MINUTES_IN_HOUR);
    var minutesCount = timeInMinute;
    if (hoursCount) {
        minutesCount -= MINUTES_IN_HOUR * hoursCount;
    }

    return template
        .replace(/%DD/g, weekInfo[daysCount].name)
        .replace(/%HH/g, getFormatNumber(hoursCount))
        .replace(/%MM/g, getFormatNumber(minutesCount));
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
    var robbingTime = moment || 0;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return moment === 0 || Boolean(moment);
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
            robbingTime += MINUTES_IN_HOUR / 2;
            var newMoment = getTheMoment(formatSchedule, robbingTime, duration);
            if (newMoment) {
                moment = newMoment;
                robbingTime = newMoment;
            }

            return newMoment === 0 || Boolean(newMoment);
        }
    };
};
