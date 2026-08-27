import { createClient } from "@supabase/supabase-js";

export default async () => {
  const supabaseUrl =
    process.env.SUPABASE_URL;

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
          "Content-Type":
            "application/json",
        },
      }
    );
  }

  const supabase =
    createClient(
      supabaseUrl,
      supabaseKey
    );

  try {
    /*
     * Find predictions belonging
     * to matches that have already
     * kicked off.
     */
    const {
      data: predictions,
      error:
        predictionError,
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
      .not(
        "matches",
        "is",
        null
      )
      .is(
        "points_awarded",
        null
      );

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
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    let scoredCount = 0;

    for (
      const prediction of predictions
    ) {
      const match =
        prediction.matches;

      if (!match) {
        continue;
      }

      /*
       * Only score matches that
       * have already kicked off.
       */
      if (
        !match.kickoff ||
        new Date(
          match.kickoff
        ).getTime() >
          Date.now()
      ) {
        continue;
      }

      /*
       * Ask football-data.org
       * for the finished match.
       */
      const response =
        await fetch(
          `https://api.football-data.org/v4/matches/${match.api_match_id}`,
          {
            headers: {
              "X-Auth-Token":
                footballApiKey,
              Accept:
                "application/json",
            },
          }
        );

      if (!response.ok) {
        continue;
      }

      const data =
        await response.json();

      const status =
        data?.status;

      /*
       * Don't score until the
       * match is finished.
       */
      if (
        status !==
        "FINISHED"
      ) {
        continue;
      }

      const homeScore =
        data?.score
          ?.fullTime
          ?.home;

      const awayScore =
        data?.score
          ?.fullTime
          ?.away;

      if (
        homeScore === null ||
        homeScore === undefined ||
        awayScore === null ||
        awayScore === undefined
      ) {
        continue;
      }

      /*
       * Determine actual result.
       */
      let actualResult =
        "DRAW";

      if (
        homeScore >
        awayScore
      ) {
        actualResult =
          "HOME";
      } else if (
        awayScore >
        homeScore
      ) {
        actualResult =
          "AWAY";
      }

      let points = 0;

      /*
       * EXACT SCORE
       *
       * Exact score = 10 points.
       * We don't add the +5 result
       * points separately.
       */
      const exactScore =
        Number(
          prediction.predicted_home_score
        ) ===
          Number(homeScore) &&
        Number(
          prediction.predicted_away_score
        ) ===
          Number(awayScore);

      if (exactScore) {
        points += 10;
      } else if (
        prediction.predicted_result ===
        actualResult
      ) {
        points += 5;
      } else {
        /*
         * Wrong winner/result.
         */
        points -= 2;
      }

      /*
       * First team to score,
       * first goalscorer and cards
       * require additional match
       * information that is not
       * guaranteed by football-data.org.
       *
       * We therefore do not award
       * those points here yet.
       */

      /*
       * Record the points event.
       */
      const {
        error:
          eventError,
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
        /*
         * If the point event
         * cannot be recorded,
         * don't mark the prediction
         * as scored.
         */
        console.error(
          eventError
        );

        continue;
      }

      /*
       * Mark this prediction as
       * scored so it cannot receive
       * points again.
       */
      const {
        error:
          updateError,
      } = await supabase
        .from("predictions")
        .update({
          points_awarded:
            points,
        })
        .eq(
          "id",
          prediction.id
        );

      if (updateError) {
        console.error(
          updateError
        );

        continue;
      }

      scoredCount += 1;
    }

    return new Response(
      JSON.stringify({
        message:
          "Prediction scoring completed.",
        scored:
          scoredCount,
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
    console.error(
      error
    );

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
