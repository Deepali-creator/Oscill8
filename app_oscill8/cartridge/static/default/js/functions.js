jQuery.fn.clickToggle = function(func1, func2) {
    var funcs = [func1, func2];
    this.data('toggleclicked', 0);
    this.click(function() {
        var data = $(this).data();
        var tc = data.toggleclicked;
        $.proxy(funcs[tc], this)();
        data.toggleclicked = (tc + 1) % 2;
    });
    return this;
};

jQuery(document).ready(function($){
    var show_cart_btn = $('#show_cart_btn');
    var menu_mobile_btn = $('#menu_mobile_btn');
    var close_mobile_menu_btn = $('#close_mobile_menu_btn');
    var mobile_menu_wrapper = $('#mobile_menu_wrapper');

    show_cart_btn.click(function (e) {
        e.preventDefault();
    });
    show_cart_btn.tooltipster({
        theme: 'tooltipster-custom',
        interactive: !0,
        position: 'bottom',
        trigger: 'click',
        animation: 'fade',
        arrow: true,
        delay: 0,
        maxWidth: 375,
        contentAsHTML: true,
        offsetY: 30
    });
    show_cart_btn.tooltipster('content', $('#mini_cart_content').html());

    $('#menu_mobile_btn').click(function (e) {
        e.preventDefault();
        $(document.body).addClass('overflow_hidden');
        $('#mobile_menu_wrapper').css('display', 'flex');
        $('#mobile_menu_wrapper').find('.inner_wrapper').animate({marginLeft: '0'}, 300);
    });
    close_mobile_menu_btn.click(function (e) {
        e.preventDefault();
        mobile_menu_wrapper.css('display', 'flex');
        mobile_menu_wrapper.find('.inner_wrapper').animate({marginLeft: -300}, 300, function () {
            mobile_menu_wrapper.hide();
            $(document.body).removeClass('overflow_hidden');
        });
    });
    $(document).on('click', '.head_popup .head_close_btn', function (e) {
        e.preventDefault();
        var head_popup = $(this).closest('.head_popup');
        head_popup.fadeOut(300);
    });

    $(document).on('click', '#mobile_menu_wrapper', function (e) {
        close_mobile_menu_btn.click();
    });

    $(document).on('click', '#mobile_menu_wrapper .inner_wrapper', function (e) {
        e.stopPropagation();
    });

});


