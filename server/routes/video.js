const express = require('express');
const router = express.Router();
const { Video } = require("../models/Video");

const { auth } = require("../middleware/auth");
const multer = require("multer");
var ffmpeg = require("fluent-ffmpeg");

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,"uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
        if(ext !== '.mp4') {
            return cb(res.status(400).end('only mp4 is allowed'), false);
        }
        cb(null, true)
    }
});

const upload = multer({storage: storage}).single("file");


//=================================
//             Video
//=================================

//비디오를 서버에 저장한다
router.post('/uploadfiles',(req, res) =>{
    upload(req, res, err => {
        if(err) {
            return res.json({success: false, err})
        }
        return res.json({success: true, url: res.req.file.path, fileName: res.req.file.filename })
    })
})

//비디오정보를 가져온다
router.post('/getVideoDetail',(req, res) =>{
    Video.findOne({"_id":req.body.videoId})
    .populate('writer')
    .exec((err, videoDetail) =>{
        if(err) return res.status(400).send(err)
        return res.status(200).json({success:true, videoDetail})
    })
})

//비디오 정보들을 저장한다
router.post('/uploadVideo',(req, res) =>{
   const video = new Video(req.body) //Video 모델의 모든 정보들을 다 가져옴
   video.save((err, doc) => {
       if (err) return res.json({success: false, err})
       res.status(200).json({success: true})
   })
})

//비디오를 DB에서 가져온다
router.get('/getVideos',(req, res) =>{
    //model 정의시 type: Schema로 정의된 모든 데이터를 불러오는 조건 => populate(값이름) 메소드 호출
    Video.find().populate('writer').exec((err,videos) => {
        if(err) return res.status(400).send(err);
        res.status(200).json({success: true, videos})
    })
 })


//썸네일 생성, 러닝타임 가져오기
router.post('/thumbnail',(req, res) =>{
    let filePath = ""
    let fileDuration = ""

    //비디오 메타 데이터 얻기
    ffmpeg.ffprobe(req.body.url, function(err, metadata) {
        fileDuration =  metadata.format.duration
    })

    //썸네일 생성 파일 경로를 넣어주면
    ffmpeg(req.body.url)
    //파일 이름을 만들어줌
    .on('filenames', function(filenames) {
        console.log("Will generate" + filenames.join(', '))
        console.log(filenames)

        filePath = "uploads/thumbnails/" + filenames[0]
    })
    //파일 이름을 만드는게 끝나면
    .on('end', function(){
        console.log('Screenshots taken')
        return res.json({success: true, url: filePath, fileDuration: fileDuration})
    })
    //에러가 나면
    .on('error', function(err) {
        console.error(err);
        return res.json({success: false, err})
    })
    //스크린샷을 만든다
    .screenshots({
        count: 3, //3개 생성
        folder: 'uploads/thumbnails',
        size: '320x240',
        filename: 'thumbnail-%b.png'
    })
})


module.exports = router;