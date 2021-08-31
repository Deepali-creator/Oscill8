jQuery(document).ready(function($){

    $('.btns-wrp .delete-btn, .btns-wrp .mob-delete-address-btn').on('click',function(e){
        e.preventDefault();
        $(this).closest('.single-address').remove();
    });

});
