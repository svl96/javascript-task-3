'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TIME_REG = /(([А-Я][А-Я]) )?(\d\d):(\d\d)\+(\d+)/;

var days = { 'ПН': 0, 'ВТ': 1, 'СР': 2, 'ЧТ': 3, 'ПТ': 4, 'СБ': 5, 'ВС': 6 };
var daysArray = ['ПН', 'ВТ', 'СР'];

function timeToMinute(time, baseTimeZone) {
    var parsedTime = TIME_REG.exec(time);
    var hour = parseInt(parsedTime[3]);
    var minute = parseInt(parsedTime[4]);
    var timeZone = baseTimeZone - parseInt(parsedTime[5]);
    var inMinute = minute + hour * 60 + timeZone * 60;
    if (days.hasOwnProperty(parsedTime[2])) {
        inMinute += (days[parsedTime[2]]) * 24 * 60;
    }

    return inMinute;
}

function getFormatSchedule(bankTimeZone) {
    return function (schedule) {
        var fromInMinute = timeToMinute(schedule.from, bankTimeZone);
        var toInMinute = timeToMinute(schedule.to, bankTimeZone);

        return { from: fromInMinute, to: toInMinute };
    };
}

function concatFreeTime(newSchedule, duration) {
    return function (finish, curr) {
        if (curr.from >= finish + duration) {
            newSchedule.push({ from: finish, to: curr.from });

            return curr.to;
        }
        finish = curr.to > finish ? curr.to : finish;

        return finish;
    };
}

function createGangFreeTime(gang, duration) {
    var end = daysArray.length * 24 * 60;
    var busyTime = Object.keys(gang)
        .reduce(concatSchedule(gang), [])
        .sort(compareTime);
    var freeTime = [];
    var finish = busyTime.reduce(concatFreeTime(freeTime, duration), 0);
    if (finish + duration <= end) {
        freeTime.push({ from: finish, to: end });
    }

    return freeTime;
}

function robberSchedule(schedule, bankTimeZone) {
    return function (acc, robber) {
        acc[robber] = schedule[robber].map(getFormatSchedule(bankTimeZone));

        return acc;
    };
}

function freeGangSchedule(schedule, bankTimeZone, duration) {
    var formatedSchedule = Object.keys(schedule).reduce(robberSchedule(schedule, bankTimeZone), {});

    return createGangFreeTime(formatedSchedule, duration);
}

function compareTime(date1, date2) {
    return date1.from - date2.from;
}

function concatSchedule(gang) {
    return function (acc, robber) {
        return acc.concat(gang[robber]);
    };
}

function getBankScheduleForWeek(workingHours) {
    return function (weekDay) {
        var dayFrom = weekDay + ' ' + workingHours.from;
        var dayTo = weekDay + ' ' + workingHours.to;

        return { from: dayFrom, to: dayTo };
    };
}

function formatBankSchedule(workingHours, timeZone) {
    var weekWorkingHours = Object.keys(days).map(getBankScheduleForWeek(workingHours));

    return weekWorkingHours.map(getFormatSchedule(timeZone));
}

function findFirstMoment(sortedSchedule, duration, startTime) {
    var endGrub = startTime;

    for (var i = 0; i < sortedSchedule.length; i++) {
        var start = sortedSchedule[i].from;
        var end = sortedSchedule[i].to;
        var finish = end < endGrub ? end : endGrub;
        if (start + duration <= finish) {
            return start;
        }
        endGrub = end > endGrub ? end : endGrub;
    }

    return false;
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
    var bankTimeZone = parseInt(TIME_REG.exec(workingHours.from)[5]);
    var freeGangTime = freeGangSchedule(schedule, bankTimeZone, 0, duration);
    var bankSchedule = formatBankSchedule(workingHours, bankTimeZone);

    return bankSchedule.concat(freeGangTime);
}

function getTheMoment(schedule, startTime, duration) {
    var sortedSchedule = schedule
        .filter(filterByStartTime(startTime))
        .sort(compareTime);

    return findFirstMoment(sortedSchedule, duration, startTime);
}

function getCountOfDuration(timeInMinute, duration) {
    var count = 0;
    while (Math.floor(timeInMinute / duration) !== 0) {
        count++;
        timeInMinute -= duration;
    }

    return count;
}

function padZeros(number) {
    if (number < 10) {
        return '0' + number;
    }

    return number.toString();
}

function getFormatTimeFromMinute(timeInMinute, template) {
    if (!timeInMinute) {
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
        .replace(/%DD/g, daysArray[dayCount])
        .replace(/%HH/g, padZeros(hourCount))
        .replace(/%MM/g, padZeros(minuteCount));
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
    var exist = moment !== false;
    var startTime = moment || 0;

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
            startTime += 30;
            var newMoment = getTheMoment(formatSchedule, startTime, duration);
            if (newMoment) {
                moment = newMoment;
                startTime = newMoment;
            }

            return newMoment !== false;
        }
    };
};
