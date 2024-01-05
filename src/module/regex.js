/**
 * 최소 8자 이상의 길이.
 * 영어 대문자, 소문자, 숫자, 특수 문자 중 최소 하나 이상의 문자를 포함.
 */
// auth, account
const pwRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!.]).{8,}$/;
const nameRegex = /^[가-힣a-zA-Z ]{2,16}$/;
const emailRegex = /^[A-Za-z0-9]{1,64}@inha\.edu$/;

// club
const clubNameRegex = /^[가-힣a-zA-Z ]{1,12}$/
const themeColorRegex = /^[a-zA-Z0-9]{6}$/;

// notification
const notificationIdRegex = /^[a-zA-Z0-9]*$/;

module.exports = {
    pwRegex,
    nameRegex,
    emailRegex,
    clubNameRegex,
    themeColorRegex,
    notificationIdRegex
}
