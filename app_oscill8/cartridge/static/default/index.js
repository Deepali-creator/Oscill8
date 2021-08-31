jQuery(document).ready(function ($) {
    var header = $('.home-container .home-intro .oscill8-header');

    $(window).scroll(function () {
        var top = $(this).scrollTop();
        if(top > $('.home-container .home-intro').outerHeight()){
            header.addClass('header-fixed');
        }else{
            header.removeClass('header-fixed');
        }
    });
});