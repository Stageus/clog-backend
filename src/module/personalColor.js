const personalColor = () => {
    return Math.random().toString(16).substr(2, 6);
}

module.exports = personalColor;
