// assume timeB later than timeA
function getDifference(dateA, dateB) {
    var difference = dateB - dateA;
    // 1000 milliseconds in 1 second, 60 seconds in 1 minute
    var differenceInMinutes = Math.floor((difference/1000)/60);
    return differenceInMinutes;
}

function getAverageTime(times) {
    if(times.length == 0) {
        return null;
    }
    var sum = 0;
    for (var i = 0; i < times.length; i++) {
        sum += times[i];
    }
    var averageTimeInMinutes = sum/times.length;
    var hours = Math.floor(averageTimeInMinutes/60);
    var minutes = Math.floor(averageTimeInMinutes % 60);
    return [hours, minutes]
}

function getTimeString(time) {
    var timeString;
    if(time[1] == 0) {
        if(time[0] == 1) {
            timeString = `${time[1]} hr`;
        } else {
            timeString = `${time[1]} hrs`;
        }
    } else {
        if(time[0] == 0) {
            timeString = `${time[1]} mins`;
        } else  {
            timeString = `${time[0]} hr ${time[1]} mins`
        }
    }
    return timeString;
}


module.exports = {
    getDifference: getDifference,
    getAverageTime: getAverageTime,
    getTimeString: getTimeString
}