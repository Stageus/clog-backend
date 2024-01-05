const { BadRequestException } = require('./customError');

const belongMapping = {
    0: "중앙 동아리",
    1: "일반 동아리",
    2: "단과대 소모임",
    3: "학과 소모임",
    4: "기타 소모임"
};

const bigCategoryMapping = {
    0: "공연",
    1: "어학",
    2: "연구",
    3: "사회",
    4: "종교",
    5: "전시",
    6: "무예",
    7: "구기",
    8: "레저",
    9: "봉사"
}

const smallCategoryMapping = {
    0: "기악",
    1: "밴드",
    2: "연극/뮤지컬",
    3: "무용",
    4: "노래/합창",
    5: "어학",
    6: "경제/사회",
    7: "순수과학",
    8: "기계/설비",
    9: "SW/IT",
    10: "역사/문화",
    11: "사회",
    12: "종교",
    13: "예술/공예",
    14: "미디어",
    15: "문학",
    16: "무예",
    17: "구기",
    18: "레저",
    19: "동물",
    20: "아동/학생",
};
module.exports = {
    getBelong: (number) => {
        const mappingResult = belongMapping[number];
        if (!mappingResult) throw new BadRequestException("존재하지 않는 학과입니다");

        return mappingResult;
    },

    getBigCategory: (number) => {
        const mappingResult = bigCategoryMapping[number];
        if (!mappingResult) throw new BadRequestException("존재하지 않는 대분류입니다");
        return mappingResult;
    },

    getSmallCategory: (number) => {
        const mappingResult = smallCategoryMapping[number];
        if (!mappingResult) throw new BadRequestException("존재하지 않는 소분류입니다");
        return mappingResult;
    }
}
