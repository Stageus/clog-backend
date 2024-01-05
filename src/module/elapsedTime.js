const elapsedTime = (id) => {
    const start = new Date(parseInt(id.substring(0, 8), 16) * 1000)
    const end = new Date()

    const diff = (end - start)/1000
    
    const unit = [
        { name: '년', milliSeconds: 60 * 60 * 24 * 365 },
        { name: '개월', milliSeconds: 60 * 60 * 24 * 30 },
        { name: '일', milliSeconds: 60 * 60 * 24 },
        { name: '시간', milliSeconds: 60 * 60 },
        { name: '분', milliSeconds: 60 },
      ]
    
    for (const value of unit) {
        const time = Math.floor(diff/value.milliSeconds)

        if (time > 0) {
            return `${time}${value.name} 전`
        }
    }
    return `방금 전`
}

module.exports = elapsedTime