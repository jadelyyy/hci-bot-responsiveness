const {badge_color_map, badge_name_map} = require("../constants/badgeData.js");

function createBadge(badgeName, message, style='flat') {
    var color;
    console.log('badgeName: ' + badgeName);
    console.log('message: ' + message);
    if(message == 'no issues') {
        message = 'no issues last month';
        color = 'blue';
    } else if(message == 'same') {
        color = 'yellow';
    } else {
        color = badge_color_map[badgeName][message];
    }
    var label = badge_name_map[badgeName];
    message = message.replace(/ /g,"%20");
    if(style == 'flat') {        
        return `<img src="https://img.shields.io/static/v1?label=${label}&message=${message}&color=${color}">`;
    } else {
        return `<img src="https://img.shields.io/static/v1?label=${label}&message=${message}&color=${color}&style=${style}">`
    }
}

function createBadgeWithData(badgeName, status, data) {
    console.log('status: ' + status);
    var color;
    if(status == 'no issues') {
        color = 'blue';
    } else if(status == 'same') {
        color = 'yellow';
    } else {
        color = badge_color_map[badgeName][status];
    }
    data = data.replace(/ /g,"%20");
    var label = badge_name_map[badgeName];
    return `<img src="https://img.shields.io/static/v1?label=${label}&message=${data}&color=${color}">`;
}

module.exports = {
    createBadge: createBadge,
    createBadgeWithData: createBadgeWithData
}