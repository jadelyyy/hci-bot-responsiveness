var response_map = {
    'faster': 'brightgreen',
    'slower': 'orange',
};

var unresponded_map = {
    'decreased': 'brightgreen',
    'increased': 'orange'
};

var ave_comments_map = {
    'increased': 'brightgreen',
    'decreased': 'orange'
};

var overall_map = {
    'improved': 'brightgreen',
    'did not improve': 'orange'
}

var badge_color_map = {
    'response_time': response_map,
    'unresponded': unresponded_map,
    'ave_comments': ave_comments_map,
    'overall': overall_map
};

var badge_name_map = {
    'response_time': 'response%20time',
    'unresponded': 'num%20unresponded',
    'ave_comments': 'num%20comments',
    'overall': 'responsiveness'
}

module.exports = {
    badge_color_map: badge_color_map,
    badge_name_map: badge_name_map
}