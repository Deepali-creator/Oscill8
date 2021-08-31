jQuery(document).ready(function($){

    $('.subscription-payments-shipping .sps-toggle-wrapper .sps_toggle_btn').on('click',function(e){
        e.preventDefault();

        var sps_items = $(this).closest('.sps-toggle-wrapper').next('.sps-items');

        sps_items.slideToggle();
    });
});

