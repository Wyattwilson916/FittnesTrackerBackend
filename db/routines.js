const client = require("./client");

async function getRoutineById(id) {
  try {
    const {
      rows: [routine],
    } = await client.query(`
            SELECT * FROM routines
            WHERE id=${id};
        `);
    return routine;
  } catch (error) {
    console.error("Problem getting routine by ID", error);
  }
}

async function getRoutinesWithoutActivities() {
  try {
    const { rows: routines } = await client.query(`
            SELECT *
            FROM routines;
        `);
    return routines;
  } catch (error) {
    console.error("Problem returning routines w/o activities", error);
  }
}

function mapOverRoutines(routines) {
  const map = {};

  for (let routine of routines) {
    if (!map[routine.id]) {
      map[routine.id] = {
        id: routine.id,
        creatorId: routine.creatorId,
        creatorName: routine.creatorName,
        isPublic: routine.isPublic,
        name: routine.name,
        goal: routine.goal,
        activities: [],
      };
      if (routine.activityId) {
        map[routine.id].activities.push({
          activityId: routine.activityId,
          activityName: routine.activityName,
          description: routine.description,
          duration: routine.duration,
          count: routine.count,
        });
      }
    } else {
      map[routine.id].activities.push({
        activityId: routine.activityId,
        activityName: routine.activityName,
        description: routine.description,
        duration: routine.duration,
        count: routine.count,
      });
    }
  }
  return Object.values(map);
}

async function getAllRoutines() {
  try {
    const { rows } = await client.query(`
        SELECT routines.id,
            routines."creatorId",
            users.username AS "creatorName",
            routines."isPublic",
            routines.name,
            routines.goal,
            activities.id AS "activityId",
            activities.name AS "activityName",
            activities.description,
            routine_activities.duration,
            routine_activities.count
        FROM users
        JOIN routines
        ON users.id = routines."creatorId"
        LEFT JOIN routine_activities
        ON routines.id = routine_activities."routineId"
        LEFT JOIN activities
        ON routine_activities."activityId" = activities.id;
        `);

    return mapOverRoutines(rows);
  } catch (error) {
    console.error("Problem getting all routines", error);
  }
}



async function getAllPublicRoutines() {
    const routines = await getAllRoutines();
    const publicRoutines = routines.filter((routine) => {
        return routine.isPublic;
    });
    
    return publicRoutines;
}

async function getAllRoutinesByUser({ username }) {
    const routines = await getAllRoutines();
    const userRoutines = routines.filter((routine) => {
        return routine.creatorName === username;
    });
    
    return userRoutines;
}

async function getPublicRoutinesByUser({ username }) {
    const userRoutines = await getAllRoutinesByUser({ username });
    const publicRoutines = userRoutines.filter((routine) => {
        return routine.isPublic;
    });
    
    return publicRoutines;
}

async function getPublicRoutinesByActivity({ id }) {
    const routines = await getAllPublicRoutines();
    const activityRoutines = routines.filter((routine) => {
        for (let activity of routine.activities) {
            return activity.activityId === id;
        }
    });
    
    return activityRoutines;
}

async function createRoutine({ creatorId, isPublic, name, goal }) {
  try {
    const {
      rows: [routine],
    } = await client.query(
      `
            INSERT INTO routines ("creatorId", "isPublic", name, goal)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `,
      [creatorId, isPublic, name, goal]
    );
    return routine;
  } catch (error) {
    console.error("Problem creating routines...", error);
  }
}

async function updateRoutine({id, isPublic, name, goal}) {
    const fields = { isPublic, name, goal };
    
    if (typeof fields.isPublic !== "boolean"){
        delete fields.isPublic
    }
    const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");

  if (setString.length === 0) {
    return;
  }
  try {
    const { rows: [routine] } = await client.query(`
        UPDATE routines
        SET ${setString}
        WHERE id=${id}
        RETURNING *;
        `, Object.values(fields));
    return routine;
  } catch (error) {
    console.error("Problem updating routine", error);
  }
}

async function destroyRoutine(id){
    try {
        await client.query(`
          DELETE FROM routine_activities
          WHERE "routineId"=${id};
          DELETE FROM routines
          WHERE id=${id};
        `);
        console.log('Finished deleting routine!')
    } catch (error) {
        console.error('Problem deleting routine...', error)
    }
}

module.exports = {
  createRoutine,
  getRoutineById,
  getRoutinesWithoutActivities,
  getAllRoutines,
  getAllPublicRoutines,
  getAllRoutinesByUser,
  getPublicRoutinesByUser,
  getPublicRoutinesByActivity,
  updateRoutine,
  destroyRoutine
};