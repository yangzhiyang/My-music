var Music = (function(){
    function _Music(){
        this.sid = '';
        this.currentChannelsId = 2;
        this.isSilence = false;
        this.isLike = false;
        this.likeSongsList ={
            num: 0,
            songsList:[]
        };
        this.currentChannels = [];
        this.channels = [];
        this.playing = true;
        this.currentSong = {};
        this.lyrics = [];
        this.lyricsNum = 1;
        this.time;
        this.getChannels();
    }
    _Music.prototype.getChannels = function(){
        var _this = this
        $(document).ready(function(){
            
            console.log(this);
            //没有高度无法滚动
            var lyricBoxHeight = $('.fm-container').innerHeight()-$('#main').outerHeight()-$('.topbar').outerHeight()-60;
            $('.lyric').css('height',lyricBoxHeight+'px');
            
            //获频道信息
            $.get("https://jirenguapi.applinzi.com/fm/getChannels.php")
            .done(function(response){
                console.log(this);
                _this.renderChannels(response);
                _this.loadPlaylist();
                _this.updateChannels();
                _this.getMusic();
            })
            $('audio').attr('autoplay','true');
            _this.initPlayerProgress();
        })
    }
    _Music.prototype.renderChannels = function(response){
        this.channels = JSON.parse(response).channels;
        var favoriteObj = {name:"我的收藏",channel_id:"favorite"};
        var nullObj = {name:"占四个字",channel_id:""};
        this.channels.unshift(favoriteObj)
        //为了展示我的收藏和最后一个频道
        this.channels.unshift(nullObj)
        this.channels.push(nullObj)
        this.currentChannels = this.channels.slice(1, 4)
    }
    _Music.prototype.loadPlaylist = function(){
        if(localStorage.getItem('likeSongs')){
            this.likeSongsList.songsList =JSON.parse(localStorage.getItem('likeSongs'))
            var html = ''
            this.likeSongsList.songsList.forEach(function(val,index){
                html += `<li>
                            <div class="list-item-title">${val.title}</div>
                            <div class="list-item-artist">${val.artist}</div>
                            <div class="delete">删除</div>
                         </li>`
            })
            $('.playlist').empty().append(html)
        }
    }
    _Music.prototype.updateChannels = function(){
        for(var i=0; i<3; i++){
            $('.channels>li').eq(i).text(this.currentChannels[i].name);
        }
    }
    _Music.prototype.getMusic = function(){
        var _this = this;
        var arr = [];
        this.playing = true;
        this.isRequesting = true;
        
        if(this.currentChannels[1].channel_id === 'favorite'){ 
            this.isLike = true;
            $('.like').eq(0).css('color','red')  ;   
            if(this.likeSongsList.num<this.likeSongsList.songsList.length){
                this.currentSong = this.likeSongsList.songsList[this.likeSongsList.num];
                this.likeSongsList.num += 1  ;                         
            }else if(this.likeSongsList.songsList.length>0){
                this.likeSongsList.num = 0;
                this.currentSong = this.likeSongsList.songsList[this.likeSongsList.num];
            }else{
                this.currentChannelsId++;
                this.currentChannels = channels.slice(this.currentChannelsId-1, this.currentChannelsId+2);
                $('.channels>li:first').css('opacity','0');
                alert('我的收藏‘还是空的哦，先从别的频道收藏几首喜欢的音乐吧！');
                this.updateChannels()
                this.getMusic()
            }
            this.isRequesting = false
            this.sid = this.currentSong.sid;                
            this.loadDeatils(this.sid)                        
            $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
        }else{
            $.get("https://jirenguapi.applinzi.com/fm/getSong.php",{channel: this.currentChannels[1].channel_id})
            .done(function(response){
                
                //获取新歌曲时将上一首歌曲的歌词置空
                var num = 1
                _this.currentSong = JSON.parse(response).song[0]
                console.log(JSON.parse(response));
                _this.sid = _this.currentSong.sid
                _this.isRequesting = false
                _this.loadDeatils(_this.sid)
                //获取新歌后将 '.lyric'元素滚动置零
                $('.lyric').scrollTop(0)
                _this.playing = true
                $('.play-or-pause').removeClass('icon-pause').addClass('icon-play')
                //判断收藏列表中是否存在当前歌曲
                _this.likeSongsList.songsList.forEach(function(val,index){
                    arr.push(val.sid)
                })
                if(arr.indexOf(_this.sid)>-1){
                    console.log(1)
                    _this.isLike = true
                    $('.like').eq(0).css('color','red')
                    console.log(2)
                }else{
                    _this.isLike = false
                    $('.like').eq(0).css('color','#333')
                }
            })
        }            
    }
    _Music.prototype.initPlayerProgress = function(){
        var _this = this;
        var duration;
        var volume;
        $('.next,.channels>li:last').on('click',function(){
            if(_this.currentChannelsId >= _this.channels.length-2) return
            _this.currentChannelsId++
            _this.currentChannels = _this.channels.slice(_this.currentChannelsId-1, _this.currentChannelsId+2)
            if(!(_this.currentChannels[1].channel_id ==='favorite')){
                $('.channels>li:first').css('opacity','1')
            }
            _this.updateChannels()
            _this.getMusic()
        })
        //切换上一个频道
        $('.prev,.channels>li:first').on('click',function(){
            if(_this.currentChannelsId <= 1) return
            _this.currentChannelsId--
            _this.currentChannels = _this.channels.slice(_this.currentChannelsId-1, _this.currentChannelsId+2)
            if(_this.currentChannels[1].channel_id ==='favorite'){
                $('.channels>li:first').css('opacity','0')
            }
            if(_this.currentChannels[1].channel_id === 'favorite'){
                if(_this.likeSongsList.songsList.length === 0){
                    alert('我的收藏‘还是空的哦，先从别的频道收藏几首喜欢的音乐吧！')
                    _this.currentChannelsId++
                    _this.currentChannels = _this.channels.slice(_this.currentChannelsId-1, _this.currentChannelsId+2)
                    $('.channels>li:first').css('opacity','1')
    
                }
            }                    
            _this.updateChannels()
            _this.getMusic()
        })
        //换歌
        $('.next-song').on('click', function(){
            if(_this.isRequesting) return
            _this.getMusic();
        }) 
        //播放、暂停
        $('.play-or-pause').on('click',function(){
            _this.playing ? $('audio')[0].pause():$('audio')[0].play()
            _this.playing ? $(this).removeClass('icon-play').addClass('icon-pause') : $(this).removeClass('icon-pause').addClass('icon-play')
            _this.playing = !_this.playing
        })
        //监听是否播放完毕
        $('audio').on('ended', function(){
            _this.getMusic();
        })
        //监听播放位置 
           
        $('audio').on('timeupdate',function(){
            var currentTime = this.currentTime
            var lastCurrent = $('.lyric>li.current-line:last')
            var currentOffset = lastCurrent.offset()
            var lyricTop = $('.lyric-wrap').offset().top
            var lyricsHeight = $('.lyric-wrap').outerHeight()
            var lineHeight = $('.lyric').children('li').eq(0).outerHeight()+5
            
            _this.lyrics.forEach(function(lyric,index){
                if( currentTime > lyric.time){
                    _this.highlight(index)
                        if(currentOffset&&lastCurrent.offset().top-lyricTop>lyricsHeight/2-100){
                            $('.lyric').scrollTop(lineHeight*_this.lyricsNum)
                            _this.lyricsNum++                                
                        }   
                }
            }) 
        })        
        //加载时间
        $('audio').on('canplay', function(){ 
            duration = $('audio')[0].duration
            clock = setInterval(function(){
                if(this.time >= Math.floor(duration)){
                    clearInterval(clock)
                    return
                }
                this.time = $('audio')[0].currentTime;
                var timeRate = Math.floor(time/duration*100) + '%'
                $('.played').css('width', timeRate);
                _this.leftTime(duration - time);
        }, 1000);
        })
        //调节播放进度
        $('.time-line>.line').on('click', function(e){
            var position = e.pageX - $(this).offset().left
            var time = position/$(this).innerWidth()*duration
            $('audio')[0].currentTime = time;
        })
        //调解音量
        $('.volume-controler').on('click',function(e){
            event.stopPropagation()
            var position = e.pageY - $(this).offset().top
            volume = (position-5)/50
            if(volume >=1){
                _this.isSilence = true;                
                _this.changeVolume(1);
            }else if(volume <=0){
                _this.isSilence = false;                
                _this.changeVolume(0);
            }else{
                _this.isSilence = false;                
                _this.changeVolume(volume);
            }
        })
        //直接静音和恢复
        $('.volume').on('click',function(){
            _this.isSilence = !_this.isSilence;
            if(_this.isSilence){
                _this.changeVolume(1);
            }else{
                _this.changeVolume(0)  ;                      
            }
        })
    
        //收藏歌曲
        $('.like').on('click',function(){
            _this.isLike = !_this.isLike;
            console.log(1);
            if(_this.isLike){
                $(this).css('color','red'); 
                _this.likeSongsList.songsList.push(_this.currentSong);
                _this.likeSongsList.num += 1 ;
                localStorage.setItem('likeSongs', JSON.stringify(_this.likeSongsList.songsList));
                _this.loadPlaylist();
            }else{
                $(this).css('color','#333');
                _this.sid = _this.currentSong.sid;
                _this.likeSongsList.songsList.forEach(function(val,index){
                    if(val.sid == _this.sid){
                        _this.likeSongsList.songsList.splice(index,1);
                        localStorage.setItem('likeSongs', JSON.stringify(_this.likeSongsList.songsList));                               
                    } 
                })                           
                _this.loadPlaylist();
            }
        })
        //列表中删除收藏歌曲
        $('.playlist').on('click','li>.delete',function(e){
            e.stopPropagation();
            var index = $('.playlist>li>.delete').index($(this));
            if(_this.likeSongsList.songsList[index].sid == _this.sid){
                $('.like').css('color','#333');
                _this.isLike = false;
            }
            _this.likeSongsList.songsList.splice(index,1);
            localStorage.setItem('likeSongs', JSON.stringify(_this.likeSongsList.songsList));                    
            _this.loadPlaylist();
        })
        //点击喜欢列表中的歌曲，即播放该歌曲
        $('.playlist').on('click','li',function(){
            var listIndex = $('.playlist>li').index($(this));
            _this.currentSong = _this.likeSongsList.songsList[listIndex];
            _this.likeSongsList.num = listIndex;
            _this.loadDeatils(currentSong.sid);
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
        this.isSilence ? $('.volume').css('color','red') : $('.volume').css('color','#333');
        
    }
    _Music.prototype.loadPlaylist = function(){
        var _this = this;
        if(localStorage.getItem('likeSongs')){
            _this.likeSongsList.songsList =JSON.parse(localStorage.getItem('likeSongs'));
            var html = '';
            this.likeSongsList.songsList.forEach(function(val,index){
                html += `<li>
                            <div class="list-item-title">${val.title}</div>
                            <div class="list-item-artist">${val.artist}</div>
                            <div class="delete">删除</div>
                         </li>`
            })
            $('.playlist').empty().append(html);    
        }
    }
    _Music.prototype.loadDeatils = function(){
        this.lyrics = [];
        $('img').attr("src",this.currentSong.picture);
        $('.title').text(this.currentSong.title);
        $('.artist').text(this.currentSong.artist);
        $('audio').attr('src', this.currentSong.url);
        $('.played').css('width','0%');
        this.loadLrc(this.sid);
    }
    _Music.prototype.loadLrc = function(){
        var _this = this;
        $.get("https://jirenguapi.applinzi.com/fm/getLyric.php",{sid:this.sid})
        .done(function(response){
           _this. parseLyric(JSON.parse(response).lyric);
            $('.lyric').html(_this.lyrics);
            _this.renderLrc();             
        })
    }
    _Music.prototype.parseLyric = function(lrc){
        var lyricsArr = lrc.split("\n");
        var _this = this;
        lyricsArr.forEach(function(lyrItem,index){
            var lyrObj = {};
            var timeReg = /\[(?:\d+:)\d+.\d+]/g;
            var timeRegArr = lyrItem.match(timeReg);
            var lrcRegArr = lyrItem.match(/\][^\[].*/g);
            var content = lyrItem.replace(timeReg,'');
            console.log(lrcRegArr);
            if(timeRegArr!==null){
                timeRegArr.forEach(function(timeItem){
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
                _this.lyrics.push(lyrObj);
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
            $('.lyric>li.current-line').prev().removeClass('current-line');
        }
    }

    return {
        init: function(){
            new _Music();
        }
    }  
})();
Music.init();

