jQuery(document).ready(function () {
    var editBtn = $('#edit-form'),
        changeableInputs = $('.changeable-inputs'),
        changeablePart = $('.changeable-part'),
        cancelBtn = $('#cancel-form');

    function editForm() {
        changeablePart.addClass('active-tochange');
        changeableInputs.prop('disabled', false);

        cancelBtn.addClass('show');
        editBtn.removeClass('show');
    }

    function cancelForm() {
        changeablePart.removeClass('active-tochange');
        changeableInputs.prop('disabled', true);

        cancelBtn.removeClass('show');
        editBtn.addClass('show');
    }

    $(document).on('click', '#edit-form', function (e) {
        e.preventDefault();
        editForm();
    });

    $(document).on('click', '#cancel-form', function (e) {
        e.preventDefault();
        cancelForm();
    });

    $('#toggle-edit').clickToggle(function () {
        changeablePart.addClass('active-tochange');
        changeableInputs.prop('disabled', false);
    }, function () {
        changeablePart.removeClass('active-tochange');
        changeableInputs.prop('disabled', true);
    });
});