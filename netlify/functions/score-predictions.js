import { createClient } from "@supabase/supabase-js";

export default async () => {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const footballApiKey =
    process.env.FOOTBALL_DATA_API_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    !footballApiKey
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Required environment variables are missing.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseKey
  );

  try {
    const {
      data: predictions,
      error: predictionError,
    } = await supabase
      .from("predictions")
      .select(`
        id,
        user_id,
        match_id,
        predicted_result,
        predicted_home_score,
        predicted_away_score,
        predicted_first_team,
        predicted_first_scorer,
        predicted_cards,
        points_awarded,
        matches (
          id,
          api_match_id,
          home_team,
          away_team,
          kickoff,
          status
        )
      `)
      .not("matches", "is", null)
      .is("points_awarded", null);

    if (predictionError) {
      throw predictionError;
    }

    if (
      !predictions ||
      predictions.length === 0
    ) {
      return new Response(
        JSON.stringify({
          message:
            "No unscored predictions found.",
          scored: 0,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    let scoredCount = 0;

    for (const prediction of predictions) {
      const match = prediction.matches;

      if (!match) {
        continue;
      }

      if (
        !match.kickoff ||
        new Date(match.kickoff).getTime() >
          Date.now()
      ) {
        continue;
      }

      const response = await fetch(
        `https://api.football-data.org/v4/matches/${match.api_match_id}`,
        {
          headers: {
            "X-Auth-Token":
              footballApiKey,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data?.status !== "FINISHED") {
        continue;
      }

      const homeScore =
        data?.score?.fullTime?.home;

      const awayScore =
        data?.score?.fullTime?.away;

      if (
        homeScore === null ||
        homeScore === undefined ||
        awayScore === null ||
        awayScore === undefined
      ) {
        continue;
      }

      let actualResult = "DRAW";

      if (homeScore > awayScore) {
        actualResult = "HOME";
      } else if (awayScore > homeScore) {
        actualResult = "AWAY";
      }

      let points = 0;

      /*
       * EXACT SCORE
       * +10 points
       */
      const exactScore =
        Number(
          prediction.predicted_home_score
        ) === Number(homeScore) &&
        Number(
          prediction.predicted_away_score
        ) === Number(awayScore);

      if (exactScore) {
        points += 10;
      } else if (
        prediction.predicted_result ===
        actualResult
      ) {
        /*
         * CORRECT RESULT
         * +5 points
         */
        points += 5;
      } else {
        /*
         * WRONG RESULT
         * -2 points
         */
        points -= 2;
      }

      /*
       * Prevent duplicate point events.
       */
      const {
        data: existingEvent,
        error: existingError,
      } = await supabase
        .from("point_events")
        .select("id")
        .eq(
          "user_id",
          prediction.user_id
        )
        .eq(
          "match_id",
          match.id
        )
        .limit(1);

      if (existingError) {
        console.error(existingError);
        continue;
      }

      if (
        existingEvent &&
        existingEvent.length > 0
      ) {
        await supabase
          .from("predictions")
          .update({
            points_awarded: points,
          })
          .eq(
            "id",
            prediction.id
          );

        continue;
      }

      /*
       * Add points to the
       * point_events table.
       */
      const {
        error: eventError,
      } = await supabase
        .from("point_events")
        .insert({
          user_id:
            prediction.user_id,

          match_id:
            match.id,

          points,

          created_at:
            new Date().toISOString(),
        });

      if (eventError) {
        console.error(eventError);
        continue;
      }

      /*
       * Mark the prediction as
       * scored.
       */
      const {
        error: updateError,
      } = await supabase
        .from("predictions")
        .update({
          points_awarded: points,
        })
        .eq(
          "id",
          prediction.id
        );

      if (updateError) {
        console.error(updateError);
        continue;
      }

      scoredCount += 1;
    }

    return new Response(
      JSON.stringify({
        message:
          "Prediction scoring completed.",
        scored: scoredCount,
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          "Unable to score predictions.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }
};
