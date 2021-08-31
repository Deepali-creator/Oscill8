$.noConflict();
$('#placeOrder').on('click' ,function(e)
{
   var paypalSelect = document.getElementById('paypalSelected');  
   console.log(paypalSelect.checked);
    $.ajax({
      type: 'GET',
      url: 'Xipay-Paypal',
      dataType: 'html',
    //   data:  {
    //       categoryName: categoryName,
    //   },
      success: function (data, xhr, status) {
         
         console.log('success');
         console.log('url '+data);
        
      },
      error: function (xhr, textStatus, error) {
           console.log('4 '+error);
      }
  });
  


});
