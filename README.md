# Clog

## 인하대학교 동아리 홍보, 및 활동 커뮤니티

### 목표
	1. 효과적인 동아리 홍보 및 가입을 위한 플랫폼 구축
	2. 동아리 내에서의 원활한 소통, 활동을 위한 커뮤니티 구축

### 주요 기능
	- 관심있는 분야, 키워드를 통해 동아리 홍보글을 검색할 수 있음.
	- 익명제로 홍보물에 댓글을 달아 관심있는 동아리 운영진에게 자유롭게 질문 하거나 의견을 나눌 수 있음.
	- 동아리 부원들끼리 자유롭게 게시판을 만들고 게시글을 작성, 조회 할 수 있음.
    	- 이미지 30장 안으로 사진과 글을 공유할 수 있음, 실명제 댓글로 자유롭게 소통 가능
		- 제목, 글쓴이와 관련있는 게시물을 검색할 수 있음
	- 운영진의 입장에서 간편하게 동아리 내부 커뮤니티를 관리할 수 있음
    	- 동아리원 관리(퇴출, 직책 부여, 가입신청 승인 및 거절, 가입신청 가능 여부 변경)
      	- 동아리 프로필 관리(동아리 소개글, 테마, 프로필로고, 베너 수정 가능)
      	- 동아리방 관리(게시판 목록 수정, 공지사항 게시)

### 역할
	- 프로젝트 매니저(pm) + 백엔드 개발
	- 주 2회 회의를 통해 전체적인 프로젝트의 요구사항을 수립하고 정제
	- erd 설계(vsc erd editor 이용)
	- 서버 구축 (aws ec2)
	- 데이터베이스 (psql을 이용해 터미널에서 데이터베이스 작업)
		- 로컬에서 db작업 후 배포 시 dump파일로 ubuntu 서버로 db dump
	- api 명세서 구축. (총 90개의 api)
		- 백엔드 어플리케이션의(express) 라우팅 폴더 구조에 따라 api 설계
	- 코드 컨벤션 구축
		- 직접 만든 validation함수 사용법, 문서화
		- 응답 코드 통일화
		- request, response 형식 통일
---

## 폴더 구조
```shell
src/
├── config			# 프로젝트 설정 파일 (DB, JWT, AWS ...)
│   └── database
├── middleware			# 미들웨어 (auth, errorHandling ...)
├── module			# 유틸성 함수, 모듈
└── routes			# 라우팅
    └── posts
        ├── general
        ├── notice
        └── promotion
```

## 사용 기술
### Language
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=Javascript&logoColor=black)
![JavaScript](https://img.shields.io/badge/NodeJs-339933?style=for-the-badge&logo=node.js&logoColor=white)

### Framework
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=Express&logoColor=white")

### Database
![PostgreSQL](https://img.shields.io/badge/PostgreSql-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-94D82D?style=for-the-badge&logo=MongoDB&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### Server
![Redis](https://img.shields.io/badge/EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white)
![Ec2](https://img.shields.io/badge/Ubuntu-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Ubuntu](https://img.shields.io/badge/S3-569A31?style=for-the-badge&logo=AmazonS3&logoColor=white)

### Communication
![Notion](https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=Notion&logoColor=white)
