jQuery(document).ready(function($){

        $('.set-default').on('click',function(e){
            e.preventDefault();
            if(!$(this).hasClass('checked')) {
                $('.set-default.checked').removeClass('checked');
                $('.single-card.default-card').removeClass('default-card');
                $(this).addClass('checked');
                $(this).parents('.single-card').addClass('default-card');

            }
        });
        $('.delete-method').on('click',function(e){
            if($(this).attr('data-id')) {
                e.preventDefault();
                const dataId  = $(this).attr('data-id');
                $(this).parents('.btns-wrp').find('.close-popup').trigger('click');
                $('.single-card[data-id="'+dataId+'"]').remove();
            }
        });
});

