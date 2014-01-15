/** VARIABLES **/
var DEFAULT_SORT = 'date';

/** DATABASE SETUP **/

var db = openDatabase("Test", "1.0", "Test", 65535);

// concerns database
db.transaction (function (transaction) {
  var sql = "CREATE TABLE IF NOT EXISTS goals "
    + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
    + "name VARCHAR(100) NOT NULL, "
    + "date DATETIME NOT NULL, "
    + "team VARCHAR(100) NOT NULL,"
    + "notes TEXT NOT NULL)"
  transaction.executeSql(
    sql, 
    undefined, 
    function () {}, 
    function (transaction, err) {
      console.error(err);
    }
  );
});

// doctors database
db.transaction (function (transaction) {
  var sql = "CREATE TABLE IF NOT EXISTS caregivers "
    + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT," 
    + "name VARCHAR(100) NOT NULL, " 
    + "specialty VARCHAR(100) NOT NULL)"
  transaction.executeSql(
    sql,
    undefined,
    function () {},
    function (transaction, err) {
      console.error(err);
    }
  );
});

// clear everything!
$(document).on('tap', '#clear-all-goals', function () {

  // drop goals table
  db.transaction(function (transaction) {
    var sql = 'DROP TABLE goals';
    transaction.executeSql(
      sql,
      undefined,
      function () {},
      function (transaction, err) {
        console.error(err);
      }
    );
  });

  db.transaction(function (transaction) {
    var sql = 'DROP TABLE caregivers';
    transaction.executeSql(
      sql,
      undefined,
      function () {
        location.reload();
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });

});

/** ADD GOAL **/

// navigate to add goal page
$(document).on('tap', '#add-goal-button', function () {

  display_team_choices();

});

// add goal
$(document).on('tap', '#add-goal-action', function () {

  // get values
  var goal_name = $('#goal-name').val();
  var team_checked = $('#team-choices input:checked');
  var goal_notes = $('#goal-notes').val();
  var goal_id = 0;

  // check if required fields are filled in
  if ((goal_name != '') && (team_checked.length > 0)) {

    // create list of 'team'
    var team = team_checked.attr('id');
    for (var n = 1; n < team_checked.length; n++) {
      team += ',' + $(team_checked[n]).attr('id');
    }

    // add to databasae
    db.transaction(function (transaction) {
      var sql = "INSERT INTO goals (name, date, team, notes) VALUES (?, ?, ?, ?)";
      transaction.executeSql(
        sql,
        [goal_name, new Date(), team, goal_notes],
        function (transaction, result) {
          goal_id = result.insertId;
        },
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    db.transaction(function (transaction) {
      var sql = "CREATE TABLE IF NOT EXISTS status" + goal_id
        + " (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "
        + "date DATETIME NOT NULL, "
        + "progress INTEGER NOT NULL,"
        + "notes TEXT NOT NULL)"
      console.log(sql);
      transaction.executeSql(
        sql, 
        undefined, 
        function () {}, 
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    // clear inputs
    for (var i=0; i < team_checked.length; i++) {
      team_checked[i].click();
    }
    $("#goal-name").val('');
    $('#goal-notes').val('');

    // display default
    display_goals(DEFAULT_SORT);

    // change page
    $.mobile.changePage('#list-goals');

  } else {
    alert('Please fill in all required fields!');
  }
});

/** TEAM MEMBERS **/

// add team members
$(document).on('tap', '#add-team-action', function () {

  db.transaction(function(transaction) {
    var sql = 'INSERT INTO caregivers (name, specialty) VALUES (?, ?)';
    transaction.executeSql(
      sql,
      [$('#cg-name').val(), $('#cg-specialty').val()],
      function(transaction, result) {

        // clear value
        $i = result.insertId;
        $('#cg-name').val('');
        $('#cg-specialty').val('');

        // display choices with new doctor
        display_team_choices();

        // automatically check doctor off
        setTimeout(function() {
          $('#cg-' + $i).prop('checked', true).checkboxradio('refresh');
        }, 100);
      },

      function(transaction, error) {
        console.error(error);
      }
    );
  });

});

// display possible team members
function display_team_choices() {
  db.transaction(function (transaction) {
    var sql = 'SELECT * FROM caregivers';
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {

        // check if there are caregivers
        if (result.rows.length) {
          $('#no-team').css('display', 'none');

          // append html for new caregivers
          var doctors_displayed = $('#team-choices-div input').length
          for (var i=doctors_displayed; i<result.rows.length; i++) {
            var row = result.rows.item(i);
            var cgId = 'cg-' + row.id;
            $('#team-choices-div').append(
              "<input type='checkbox' name='" + cgId + "' id='" + cgId + "' />"
              + "<label for='" + cgId + "'>" + row.name + "</label>"
            ).trigger('create');
          }
        }
      },
      function (transaction, err) {
        console.err(err);
      }
    );
  });
}

/** DISPLAY GOALS **/ 
$(document).on('pageshow', '#list-goals', function () {

  display_goals(DEFAULT_SORT);

});

function display_goals(sorted_by) {

  // fix the selector
  $("#sort-goals").val(sorted_by).attr('selected', true).siblings('option').removeAttr('selected');
  
  db.transaction( function(transaction) {

    var sql = "SELECT * FROM goals"
    
    // add sorted by params
    if (sorted_by == 'date') {
      sql += " ORDER BY " + sorted_by + ' DESC';
    } else {
      sql += " ORDER BY " + sorted_by;
    }

    transaction.executeSql(
      sql, 
      undefined, 
      function (transaction, result) {
        if (result.rows.length) {

          // remove previous elements
          $("#goals-list").empty();
          $("#no-goals").css("display","none");

          // add each list item
          for (var i = 0; i < result.rows.length; i++) {
            var row = result.rows.item(i);
            $("#goals-list").append(
              "<li id='" + row.id + "' class='ui-li-has-alt'>"
              + "<a href='#add-goal' onclick='set_details("+row.id+")' class='ui-btn'>" + row.name + "</a>"
              + "<a href='#status-update' onclick='display_status_details("+row.id+")' class='ui-btn ui-btn-icon-notext ui-icon-plus'>Plus</a>" 
              + "</li>"
            );
          }
        }
      }, 
      function (transaction, err) {
        console.error(err);
      }
    );
  });
}

/** ADD STATUS UPDATE **/

// display status details for new status update
function display_status_details(id) {

  db.transaction(function (transaction) {
    var sql = "SELECT * FROM goals WHERE id=" + id;
    transaction.executeSql(
      sql,
      undefined,
      function (transaction, result) {
        var item = result.rows.item(0);
        $('#update-goal-id').val(item.id);
        $('#update-goal-name').val(item.name);
        $('#update-date').val(new Date());
      },
      function (transaction, err) {
        console.error(err);
      }
    );
  });

}

// add new status update
$(document).on('tap', '#update-action', function () {

  var goal_id = $('#update-goal-id').val();
  var date = $('#update-date').val();
  var progress = $('#update-progress').val();
  var notes = $('#update-notes').val();

  if ((progress != "") && (notes != "")) {
    db.transaction(function (transaction) {
      var sql = "INSERT INTO status" + goal_id + " (date, progress, notes) VALUES (?, ?, ?)";
      transaction.executeSql(
        sql,
        [date, progress, notes],
        function (transaction, result) {},
        function (transaction, err) {
          console.error(err);
        }
      );
    });

    $.mobile.changePage('#list-goals');

  } else {
    alert('Please fill in all required fields!');
  }

});
