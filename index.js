var Music = (function(){
    function _Music(){
        this.sid = '';
        this.isSilence = false;
        this.isLike = false;
        this.isChecked = false; 
        this.isCilcked = false;
        this.isPlaylist = false;
        this.isRequesting = false;      
        this.likeSongsList ={
            num: 0,
            songsList:[]
        };
        this.duration;
        this.playing = true;
        this.currentSong = {};
        this.lyrics = [];
        this.distance;
        this.getStart();
    }
    _Music.prototype.ajax = function(url,data){
        var promise = new Promise(function(resolve,reject){
            $.ajax({
                url: url,
                method: 'GET',
                data: data
            }).done(function(response){
                resolve(response);
            }).fail(function(jqXHR,statusText){
                reject(new Error(statusText));
            })
        })
        return promise;
    }
    _Music.prototype.getStart = function(){
        $(document).ready(()=>{            
            this.loadPlaylist();
            this.getMusic();    
            $('audio').attr('autoplay','true');
            this.initPlayerProgress();
        })
    }
    _Music.prototype.loadPlaylist = function(){
        if(localStorage.getItem('likeSongs')){
            this.likeSongsList.songsList =JSON.parse(localStorage.getItem('likeSongs'))
            var html = ''
            this.likeSongsList.songsList.forEach(function(val,index){
                html += `<li>
                            <div class="list-item-title">${val.title}</div>
                            <div class="list-item-artist">${val.artist}</div>
                            <div class="delete iconfont icon-shanchu"></div>
                         </li>`
            })
            $('.playlist').empty().append(html)
        }
    }
    _Music.prototype.getMusic = function(){
        var arr = [];
        this.playing = true;
        this.isRequesting = true;
        
        if(this.isPlaylist){ 
            this.isLike = true;
            $('.like').eq(0).css('color','red')  ;   
            if(this.likeSongsList.num<this.likeSongsList.songsList.length){
                this.currentSong = this.likeSongsList.songsList[this.likeSongsList.num];
                this.likeSongsList.num += 1  ;                         
            }else if(this.likeSongsList.songsList.length>0){
                this.likeSongsList.num = 0;
                this.currentSong = this.likeSongsList.songsList[this.likeSongsList.num];
            } 
            this.isRequesting = false
            this.sid = this.currentSong.sid;                
            this.loadDeatils(this.sid)                        
            $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
            if(this.isChecked){
                $('.photo').css({'background':'url('+this.currentSong.picture+')','background-size':'cover','display':'block'})            
            }
        }else{
            this.ajax("https://jirenguapi.applinzi.com/fm/getSong.php",{channel: "public_yuzhong_yueyu"}).then((response)=>{
                 //获取新歌后将 '.lyric'元素滚动置零
                $('#music-lyric').scrollTop(0)
                //获取新歌曲时将上一首歌曲的歌词置空
                var num = 1
                this.currentSong = JSON.parse(response).song[0]
                this.sid = this.currentSong.sid
                this.isRequesting = false
                this.loadDeatils(this.sid)
                this.playing = true
                $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
                //判断收藏列表中是否存在当前歌曲
                this.likeSongsList.songsList.forEach(function(val,index){
                    arr.push(val.sid)
                })
                if(arr.indexOf(this.sid)>-1){
                    this.isLike = true
                    $('.like').eq(0).css('color','red')
                }else{
                    this.isLike = false
                    $('.like').eq(0).css('color','#4bb0ca')
                }
                if(this.isChecked){
                    $('.photo').css({'background':'url('+this.currentSong.picture+')','background-size':'cover','display':'block'})            
                }
                return this.sid
            }).then((sid)=>{
                this.ajax("https://jirenguapi.applinzi.com/fm/getLyric.php",{sid:sid}).then((response)=>{
                    this.loadLrc(response)
                })
            })
        }

    }
    _Music.prototype.initPlayerProgress = function(){
        var volume;
        //换歌
        $('.next-song').on('click', ()=>{
            if(this.isRequesting) return
            this.getMusic();
        }) 
        //播放、暂停
        $('.play-or-pause').on('click',()=>{
            this.playing ? $('audio')[0].pause():$('audio')[0].play()
            this.playing ? $('.play-or-pause').removeClass('icon-play').addClass('icon-pause') : $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
            this.playing = !this.playing
        })
        //监听是否播放完毕
        $('audio').on('ended', ()=>{
            this.getMusic();
            
        })
        //监听播放位置 
           
        $('audio').on('timeupdate',()=>{
            var currentTime = $('audio')[0].currentTime;
            var lastCurrent = $('.lyric>li.current-line:last');
            var currentOffset = lastCurrent.offset();
            var lyricTop = $('#music-lyric').offset().top;
            var lyricsHeight = $('#music-lyric').outerHeight();
            var lineHeight = $('.lyric').children('li').eq(0).outerHeight()+5;
            
            this.lyrics.forEach((lyric,index)=>{
                if( currentTime > lyric.time){
                    this.highlight(index)
                        if(currentOffset&&lastCurrent.offset().top-lyricTop>lyricsHeight/2){
                            $('#music-lyric').scrollTop(lineHeight*index)
                        }else if(currentOffset&&lastCurrent.offset().top<lyricTop){
                            var distance = lyricTop-lastCurrent.offset().top+50
                            $('#music-lyric').scrollTop(distance)
                        }   
                }
            }) 
        })        
        //加载进度条
        $('audio').on('canplay', ()=>{ 
            var time = 0;
            this.duration = $('audio')[0].duration     
            var clock = setInterval(()=>{
                if(time >= Math.floor(this.duration)){
                    clearInterval(clock)
                    return
                }
                time = $('audio')[0].currentTime;
                var timeRate = Math.floor(time/this.duration*100) + '%'
                $('.time-line').css('width', timeRate);
                this.leftTime(this.duration - time);
        }, 1000);
        })
        //调节播放进度
        $('.time-contorl').on('click', (e)=>{
            var position = e.pageX - $('.time-contorl').eq(0).offset().left
            var leftTime = position/$('.time-contorl').eq(0).innerWidth()*this.duration
            $('audio')[0].currentTime = leftTime;
        })
        //调解音量
        $('.volume-controler').on('click',(e)=>{
            e.stopPropagation()
            var position = e.pageY - $('.volume-controler').eq(0).offset().top
            volume = (position-5)/50
            if(volume >=1){
                this.isSilence = true;                
                this.changeVolume(1);
            }else if(volume <=0){
                this.isSilence = false;                
                this.changeVolume(0);
            }else{
                this.isSilence = false;                
                this.changeVolume(volume);
            }
        })
        //直接静音和恢复
        $('.volume').on('click',()=>{
            this.isSilence = !this.isSilence;
            if(this.isSilence){
                this.changeVolume(1);
            }else{
                this.changeVolume(0)  ;                      
            }
        })
    
        //收藏歌曲
        $('.like').on('click',(e)=>{
            this.isLike = !this.isLike;
            if(this.isLike){
                $(e.target).css('color','red'); 
                this.likeSongsList.songsList.push(this.currentSong);
                this.likeSongsList.num += 1 ;
                localStorage.setItem('likeSongs', JSON.stringify(this.likeSongsList.songsList));
                this.loadPlaylist();
            }else{
                $(e.target).css('color','#4bb0ca');
                this.sid = this.currentSong.sid;
                this.likeSongsList.songsList.forEach((val,index)=>{
                    if(val.sid == this.sid){
                        this.likeSongsList.songsList.splice(index,1);
                        localStorage.setItem('likeSongs', JSON.stringify(this.likeSongsList.songsList));                               
                    } 
                })                           
                this.loadPlaylist();
            }
        })
        //列表中删除收藏歌曲
        $('.playlist').on('click','li>.delete',(e)=>{
            e.stopPropagation();
            var index = $('.playlist>li>.delete').index($(e.target));
            if(this.likeSongsList.songsList[index].sid == this.sid){
                $('.like').css('color','#4bb0ca');
                this.isLike = false;
            }
            this.likeSongsList.songsList.splice(index,1);
            localStorage.setItem('likeSongs', JSON.stringify(this.likeSongsList.songsList));                    
            this.loadPlaylist();
        })
        //点击喜欢列表中的歌曲，即播放该歌曲
        $('.playlist').on('click','li>.list-item-title',(e)=>{
            this.isPlaylist = true;
            var listIndex = $('.playlist>li>.list-item-title').index($(e.target));
            this.currentSong = this.likeSongsList.songsList[listIndex];
            this.sid =  this.currentSong.sid
            this.likeSongsList.num = listIndex;
            this.isLike = true;
            $('.like').eq(0).css('color','red'); 
            this.loadDeatils(this.currentSong.sid);

        })
        //点击 切换歌词
        $('.lyric-show').on('click',()=>{
            this.isChecked = !this.isChecked;
            if(this.isChecked){
                $('#music-main img,.like-list').css('display','none');
                $('#music-lyric').css('display','block');
                $('.photo').css({'background':'url('+this.currentSong.picture+')','background-size':'cover','display':'block'});
                this.isCilcked = false;
            }else{
                $('#music-main img').css('display','inline-block');
                $('#music-lyric').css('display','none');
                $('.photo').css('background','');
                this.isCilcked = false;
                this.isPlaylist = false;
            }
        })
        $('.likelist').on('click',()=>{
            this.isCilcked = !this.isCilcked;
            this.isPlaylist =!this.isPlaylist;
            if(this.isCilcked){
                $('.like-list').css('display','block');
                $('#music-main img,#music-lyric').css('display','none');
                $('.photo').css('background','');
                this.isChecked = false;
            }else{
                $('.like-list').css('display','none');
                $('#music-main img').css('display','inline-block');
                this.isChecked = false;
            }
            if(this.likeSongsList.songsList.length<=0){
                this.isPlaylist = false;
                alert('收藏列表还是空的哦，先去收藏几首喜欢的音乐吧☺');
                this.getMusic()
                $('.like-list').css('display','none');
                $('#music-main img').css('display','inline-block');
                this.isChecked = false;

            }
        })
    }
    _Music.prototype.leftTime = function(num){
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
    _Music.prototype.changeVolume = function(volume){   
        $('audio')[0].volume = 1-volume;
        $('.volume-height').css('height',volume*100+'%');
        this.isSilence ? $('.volume').css('color','red') : $('.volume').css('color','#4bb0ca');
        
    }
    _Music.prototype.loadDeatils = function(){
        this.lyrics = [];
        $('img').attr("src",this.currentSong.picture);
        $('.title').text(this.currentSong.title);
        $('.artist').text(this.currentSong.artist);
        $('audio').attr('src', this.currentSong.url);
        $('.played').css('width','0%');
    }
    _Music.prototype.loadLrc = function(response){
           this. parseLyric(JSON.parse(response).lyric);
            $('.lyric').html(this.lyrics);
            this.renderLrc();             
        
        // $.get("https://jirenguapi.applinzi.com/fm/getLyric.php",{sid:this.sid})
        // .done(function(response){
        //    _this. parseLyric(JSON.parse(response).lyric);
        //     $('.lyric').html(_this.lyrics);
        //     _this.renderLrc();             
        // })
    }
    _Music.prototype.parseLyric = function(lrc){
        var lyricsArr = lrc.split("\n");
        lyricsArr.forEach((lyrItem,index)=>{
            var lyrObj = {};
            var timeReg = /\[(?:\d+:)\d+.\d+]/g;
            var timeRegArr = lyrItem.match(timeReg);
            var lrcRegArr = lyrItem.match(/\][^\[].*/g);
            var content = lyrItem.replace(timeReg,'');
            if(timeRegArr!==null){
                timeRegArr.forEach((timeItem)=>{
                var minute = Number(String(timeItem.match(/\[\d*/i)).slice(1)),
                    second = Number(String(timeItem.match(/\:\d*/i)).slice(1)),
                    time = minute * 60 + second;
                    if(lrcRegArr !== null){
                        lyrObj.time =  time;
                        lyrObj.content = content;
                    }
               })
            }
            //api返回的歌词存在“[00:02:00][01:02:00] 同一句歌词”，改用{'时间','歌词'}保存歌词数据
            //获得{'时间','歌词'}
            if(!$.isEmptyObject(lyrObj) && lyrObj.time !== 0){
                this.lyrics.push(lyrObj);
            }
        })
        this.lyrics.sort(function(a,b){
            return a.time-b.time;
        })
        return this.lyrics;
    }
    _Music.prototype.renderLrc = function(){
        $('.lyric').empty();
        $.each(this.lyrics,function(key,val){
            var html = `<li>${val.content}</li>`;
            $('.lyric').append(html);
        })
    } 
    _Music.prototype.highlight = function(index){
        if(!$('.lyric>li').eq(index).hasClass('current-line')){
            $('.lyric>li').eq(index).addClass('current-line');
            $('.lyric>li').eq(index).siblings().removeClass('current-line');
            
        }
    }

    return {
        init: function(){
            new _Music();
        }
    }  
})();
Music.init();

