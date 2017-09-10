(function(){
    var channels,
        currentChannels,
        playing,
        time,
        duration,
        sid

    var currentChannelsId = 2,
        lyrics = [],
        currentSong = {}
        $audio = $('audio')[0],
        isSilence = false,
        isLike = false,
        // 状态锁
        isRequesting = false,
        likeSongsList ={
            num: 0,
            songsList:[]
        }
$(document).ready(function(){
    //没有高度无法滚动
    var lyricBoxHeight = $('.fm-container').innerHeight()-$('#main').outerHeight()-$('.topbar').outerHeight()-60
    $('.lyric').css('height',lyricBoxHeight+'px');
    //获频道信息
    $.get("https://jirenguapi.applinzi.com/fm/getChannels.php")
    .done(function(response){
        getChannels(response)
        loadPlaylist()
        updateChannels()
        getMusic()
    })
    $('audio').attr('autoplay','true')
    initPlayerProgress()
})
function getChannels(response){
    channels = JSON.parse(response).channels
    var favoriteObj = {name:"我的收藏",channel_id:"favorite"}
    var nullObj = {name:"占四个字",channel_id:""}
    channels.unshift(favoriteObj)
    //为了展示我的收藏和最后一个频道
    channels.unshift(nullObj)
    channels.push(nullObj)
    currentChannels = channels.slice(1, 4)
}
function initPlayerProgress(){
    //切换下一个频道
    $('.next,.channels>li:last').on('click',function(){
        if(currentChannelsId >= channels.length-2) return
        currentChannelsId++
        currentChannels = channels.slice(currentChannelsId-1, currentChannelsId+2)
        if(!(currentChannels[1].channel_id ==='favorite')){
            $('.channels>li:first').css('opacity','1')
        }
        updateChannels()
        getMusic()
    })
    //切换上一个频道
    $('.prev,.channels>li:first').on('click',function(){
        if(currentChannelsId <= 1) return
        currentChannelsId--
        currentChannels = channels.slice(currentChannelsId-1, currentChannelsId+2)
        if(currentChannels[1].channel_id ==='favorite'){
            $('.channels>li:first').css('opacity','0')
        }
        if(currentChannels[1].channel_id === 'favorite'){
            if(likeSongsList.songsList.length === 0){
                alert('我的收藏‘还是空的哦，先从别的频道收藏几首喜欢的音乐吧！')
                currentChannelsId++
                currentChannels = channels.slice(currentChannelsId-1, currentChannelsId+2)
                $('.channels>li:first').css('opacity','1')

            }
        }                    
        updateChannels()
        getMusic()
    })
    //换歌
    $('.next-song').on('click', function(){
        if(isRequesting) return
        getMusic();
    }) 
    //播放、暂停
    $('.play-or-pause').on('click',function(){
        playing ? $('audio')[0].pause():$('audio')[0].play()
        playing ? $(this).removeClass('icon-play').addClass('icon-pause') : $(this).removeClass('icon-pause').addClass('icon-play')
        playing = !playing
    })
    //监听是否播放完毕
    $('audio').on('ended', function(){
        getMusic();
    })
    //监听播放位置 
    var num = 1   
    $('audio').on('timeupdate',function(){
        var currentTime = this.currentTime
        var lastCurrent = $('.lyric>li.current-line:last')
        var currentOffset = lastCurrent.offset()
        var lyricTop = $('.lyric-wrap').offset().top
        var lyricsHeight = $('.lyric-wrap').outerHeight()
        var lineHeight = $('.lyric').children('li').eq(0).outerHeight()+5
        
        lyrics.forEach(function(lyric,index){
            if( currentTime > lyric.time){
                highlight(index)
                    if(currentOffset&&lastCurrent.offset().top-lyricTop>lyricsHeight/2-100){
                        $('.lyric').scrollTop(lineHeight*num)
                        num++                                
                    }   
            }
        }) 
    })
    //加载时间
    $('audio').on('canplay', function(){
            duration = $audio.duration
            clock = setInterval(function(){
                if(time >= Math.floor(duration)){
                    clearInterval(clock)
                    return
                }
                time = $audio.currentTime;
                var timeRate = Math.floor(time/duration*100) + '%'
                $('.played').css('width', timeRate);
                leftTime(duration - time);
        }, 1000);
    })
    //调节播放进度
    $('.time-line>.line').on('click', function(e){
        var position = e.pageX - $(this).offset().left
        time = position/$(this).innerWidth()*duration
        $audio.currentTime = time;
    })
    //调解音量
    $('.volume-controler').on('click',function(e){
        event.stopPropagation()
        var position = e.pageY - $(this).offset().top
        volume = (position-5)/50
        if(volume >=1){
            changeVolume(0)
        }else if(volume <=0){
            changeVolume(1)
        }else{
            changeVolume(volume)
        }
    })
    //直接静音和恢复
    $('.volume').on('click',function(){
        isSilence = !isSilence
        if(!isSilence){
            changeVolume(0)
        }else{
            changeVolume(1)                       
        }
    })

    //收藏歌曲
    $('.like').on('click',function(){
        isLike = !isLike
        console.log(1);
        if(isLike){
            $(this).css('color','red')   
            likeSongsList.songsList.push(currentSong)
            likeSongsList.num += 1 
            localStorage.setItem('likeSongs', JSON.stringify(likeSongsList.songsList))
            loadPlaylist()
        }else{
            $(this).css('color','#333')
            sid = currentSong.sid
            likeSongsList.songsList.forEach(function(val,index){
                if(val.sid == sid){
                    likeSongsList.songsList.splice(index,1) 
                    localStorage.setItem('likeSongs', JSON.stringify(likeSongsList.songsList))                                
                } 
            })                           
            loadPlaylist()
        }
    })
    //列表中删除收藏歌曲
    $('.playlist').on('click','li>.delete',function(e){
        e.stopPropagation()
        var index = $('.playlist>li>.delete').index($(this))
        if(likeSongsList.songsList[index].sid == sid){
            $('.like').css('color','#333')
            isLike = false
        }
        likeSongsList.songsList.splice(index,1)
        localStorage.setItem('likeSongs', JSON.stringify(likeSongsList.songsList))                    
        loadPlaylist()
    })
    //点击喜欢列表中的歌曲，即播放该歌曲
    $('.playlist').on('click','li',function(){
        var listIndex = $('.playlist>li').index($(this))
        currentSong = likeSongsList.songsList[listIndex]
        likeSongsList.num = listIndex
        loadDeatils(currentSong.sid)
    })
}

function loadPlaylist(){
    if(localStorage.getItem('likeSongs')){
        likeSongsList.songsList =JSON.parse(localStorage.getItem('likeSongs'))
        var html = ''
        likeSongsList.songsList.forEach(function(val,index){
            html += `<li>
                        <div class="list-item-title">${val.title}</div>
                        <div class="list-item-artist">${val.artist}</div>
                        <div class="delete">删除</div>
                     </li>`
        })
        $('.playlist').empty().append(html)

    }
}
function changeVolume(volume){
    $('audio')[0].volume = 1-volume
    $('.volume-height').css('height',volume*100+'%')
    isSilence?$('.volume').css('color','red'):$('.volume').css('color','#333')
}
// function quietVolume(volume){
//     $('audio')[0].volume = 1
//     $('.volume-height').css('height','0')
//     $('.volume').css('color','#3f413f')
// }
function highlight(index){
    if(!$('.lyric>li').eq(index).hasClass('current-line')){
        $('.lyric>li').eq(index).addClass('current-line')
        $('.lyric>li.current-line').prev().removeClass('current-line') 
    }
}
//更新频道状态
function updateChannels(){
    for(var i=0; i<3; i++){
        $('.channels>li').eq(i).text(currentChannels[i].name);
    }
}
function getMusic(){
    var arr = []
    playing = true
    isRequesting = true
    if(currentChannels[1].channel_id === 'favorite'){ 
        isLike = true
        $('.like').eq(0).css('color','red')     
        if(likeSongsList.num<likeSongsList.songsList.length){
            currentSong = likeSongsList.songsList[likeSongsList.num]
            likeSongsList.num += 1                           
        }else if(likeSongsList.songsList.length>0){
            likeSongsList.num = 0
            currentSong = likeSongsList.songsList[likeSongsList.num]
        }else{
            currentChannelsId++
            currentChannels = channels.slice(currentChannelsId-1, currentChannelsId+2)
            $('.channels>li:first').css('opacity','0')
            alert('我的收藏‘还是空的哦，先从别的频道收藏几首喜欢的音乐吧！')
            updateChannels()
            getMusic()
        }
        isRequesting = false
        sid = currentSong.sid;                
        loadDeatils(sid)                        
        $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
    }else{
        $.get("https://jirenguapi.applinzi.com/fm/getSong.php",{channel: currentChannels[1].channel_id})
        .done(function(response){
            //获取新歌曲时将上一首歌曲的歌词置空
            num = 1
            currentSong = JSON.parse(response).song[0]
            console.log(JSON.parse(response));
            sid = currentSong.sid
            isRequesting = false
            loadDeatils(sid)
            //获取新歌后将 '.lyric'元素滚动置零
            $('.lyric').scrollTop(0)
            playing = true
            $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
            //判断收藏列表中是否存在当前歌曲
            likeSongsList.songsList.forEach(function(val,index){
                arr.push(val.sid)
            })
            if(arr.indexOf(sid)>-1){
                console.log(1)
                isLike = true
                $('.like').eq(0).css('color','red')
                console.log(2)
            }else{
                isLike = false
                $('.like').eq(0).css('color','#333')
            }                   
        })
    }
}
function loadDeatils(sid){  
    lyrics = []  
    $('img').attr("src",currentSong.picture)
    $('.title').text(currentSong.title)
    $('.artist').text(currentSong.artist)
    $('audio').attr('src', currentSong.url)
    $('.played').css('width','0%') 
    loadLrc(sid)
}
//加载歌词
function loadLrc(sid){
    $.get("https://jirenguapi.applinzi.com/fm/getLyric.php",{sid:sid})
    .done(function(response){
        parseLyric(JSON.parse(response).lyric)
        console.log(JSON.parse(response).lyric);
        $('.lyric').html(lyrics)
        renderLrc()                  
    })
}
//解析歌词
function parseLyric(lrc) {
    var lyricsArr = lrc.split("\n")
    lyricsArr.forEach(function(lyrItem,index){
        var lyrObj = {}
        var timeReg = /\[(?:\d+:)\d+.\d+]/g
        var timeRegArr = lyrItem.match(timeReg)
        var lrcRegArr = lyrItem.match(/\][^\[].*/g)
        var content = lyrItem.replace(timeReg,'')
        console.log(lrcRegArr);
        if(timeRegArr!==null){
            timeRegArr.forEach(function(timeItem){
            var minute = Number(String(timeItem.match(/\[\d*/i)).slice(1)),
                second = Number(String(timeItem.match(/\:\d*/i)).slice(1)),
                time = minute * 60 + second
                if(lrcRegArr !== null){
                    lyrObj.time =  time
                    lyrObj.content = content
                }
           })
        }
        //api返回的歌词存在“[00:02:00][01:02:00] 同一句歌词”，改用{'时间','歌词'}保存歌词数据
        //获得{'时间','歌词'}
        if(!$.isEmptyObject(lyrObj) && lyrObj.time !== 0){
            lyrics.push(lyrObj);
        }
    })
    lyrics.sort(function(a,b){
        return a.time-b.time;
    })
    return lyrics
}

function renderLrc(){
    $('.lyric').empty()
    $.each(lyrics,function(key,val){
        var html = `<li>${val.content}</li>`
        $('.lyric').append(html)
    })
}
//展示歌曲剩余时间
function leftTime(num){
    var timeNum = Math.floor(num);
    var second = timeNum%60;
    var minute = Math.floor(timeNum/60);
    if(minute<10){
        $('.minute').html('0'+minute);
    }
    else{
        $('.minute').html(minute);
    }
    if(second<10){
        $('.second').html('0'+second);
    }
    else{
        $('.second').html(second);
    }                    
}
})()
