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
    'collab_response_time': response_map,
    'contrib_respone_time': response_map,
    'unresponded': unresponded_map,
    'ave_comments': ave_comments_map,
    'overall': overall_map
};

var badge_name_map = {
    'response_time': 'general%20response%20time',
    'collab_response_time': 'collaborator%20response%20time',
    'contrib_response_time': 'contributor%20response%20time',
    'unresponded': 'num%20unresponded',
    'ave_comments': 'num%20comments',
    'overall': 'responsiveness'
}

module.exports = {
    badge_color_map: badge_color_map,
    badge_name_map: badge_name_map
}