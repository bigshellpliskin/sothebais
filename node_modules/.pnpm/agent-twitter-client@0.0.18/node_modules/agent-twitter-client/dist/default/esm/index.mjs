import { Cookie, CookieJar } from 'tough-cookie';
import setCookie from 'set-cookie-parser';
import { Headers as Headers$1 } from 'headers-polyfill';
import { TwitterApi } from 'twitter-api-v2';
import { Type } from '@sinclair/typebox';
import { Check } from '@sinclair/typebox/value';
import * as OTPAuth from 'otpauth';
import stringify from 'json-stable-stringify';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import wrtc from '@roamhq/wrtc';
import * as fs from 'fs';
import fs__default from 'fs';
import path from 'path';
import { spawn } from 'child_process';

class ApiError extends Error {
  constructor(response, data, message) {
    super(message);
    this.response = response;
    this.data = data;
  }
  static async fromResponse(response) {
    let data = void 0;
    try {
      data = await response.json();
    } catch {
      try {
        data = await response.text();
      } catch {
      }
    }
    return new ApiError(response, data, `Response status: ${response.status}`);
  }
}

const genericPlatform = new class {
  randomizeCiphers() {
    return Promise.resolve();
  }
}();

class Platform {
  async randomizeCiphers() {
    const platform = await Platform.importPlatform();
    await platform?.randomizeCiphers();
  }
  static async importPlatform() {
    return genericPlatform;
  }
}

async function updateCookieJar(cookieJar, headers) {
  const setCookieHeader = headers.get("set-cookie");
  if (setCookieHeader) {
    const cookies = setCookie.splitCookiesString(setCookieHeader);
    for (const cookie of cookies.map((c) => Cookie.parse(c))) {
      if (!cookie) continue;
      await cookieJar.setCookie(
        cookie,
        `${cookie.secure ? "https" : "http"}://${cookie.domain}${cookie.path}`
      );
    }
  } else if (typeof document !== "undefined") {
    for (const cookie of document.cookie.split(";")) {
      const hardCookie = Cookie.parse(cookie);
      if (hardCookie) {
        await cookieJar.setCookie(hardCookie, document.location.toString());
      }
    }
  }
}

const bearerToken = "AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF";
async function requestApi(url, auth, method = "GET", platform = new Platform()) {
  const headers = new Headers$1();
  await auth.installTo(headers, url);
  await platform.randomizeCiphers();
  let res;
  do {
    try {
      res = await auth.fetch(url, {
        method,
        headers,
        credentials: "include"
      });
    } catch (err) {
      if (!(err instanceof Error)) {
        throw err;
      }
      return {
        success: false,
        err: new Error("Failed to perform request.")
      };
    }
    await updateCookieJar(auth.cookieJar(), res.headers);
    if (res.status === 429) {
      const xRateLimitRemaining = res.headers.get("x-rate-limit-remaining");
      const xRateLimitReset = res.headers.get("x-rate-limit-reset");
      if (xRateLimitRemaining == "0" && xRateLimitReset) {
        const currentTime = (/* @__PURE__ */ new Date()).valueOf() / 1e3;
        const timeDeltaMs = 1e3 * (parseInt(xRateLimitReset) - currentTime);
        await new Promise((resolve) => setTimeout(resolve, timeDeltaMs));
      }
    }
  } while (res.status === 429);
  if (!res.ok) {
    return {
      success: false,
      err: await ApiError.fromResponse(res)
    };
  }
  const value = await res.json();
  if (res.headers.get("x-rate-limit-incoming") == "0") {
    auth.deleteToken();
    return { success: true, value };
  } else {
    return { success: true, value };
  }
}
function addApiFeatures(o) {
  return {
    ...o,
    rweb_lists_timeline_redesign_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    longform_notetweets_rich_text_read_enabled: true,
    responsive_web_enhance_cards_enabled: false,
    subscriptions_verification_info_enabled: true,
    subscriptions_verification_info_reason_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    super_follow_badge_privacy_enabled: false,
    super_follow_exclusive_tweet_notifications_enabled: false,
    super_follow_tweet_api_enabled: false,
    super_follow_user_api_enabled: false,
    android_graphql_skip_api_media_color_palette: false,
    creator_subscriptions_subscription_count_enabled: false,
    blue_business_profile_image_shape_enabled: false,
    unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false
  };
}
function addApiParams(params, includeTweetReplies) {
  params.set("include_profile_interstitial_type", "1");
  params.set("include_blocking", "1");
  params.set("include_blocked_by", "1");
  params.set("include_followed_by", "1");
  params.set("include_want_retweets", "1");
  params.set("include_mute_edge", "1");
  params.set("include_can_dm", "1");
  params.set("include_can_media_tag", "1");
  params.set("include_ext_has_nft_avatar", "1");
  params.set("include_ext_is_blue_verified", "1");
  params.set("include_ext_verified_type", "1");
  params.set("skip_status", "1");
  params.set("cards_platform", "Web-12");
  params.set("include_cards", "1");
  params.set("include_ext_alt_text", "true");
  params.set("include_ext_limited_action_results", "false");
  params.set("include_quote_count", "true");
  params.set("include_reply_count", "1");
  params.set("tweet_mode", "extended");
  params.set("include_ext_collab_control", "true");
  params.set("include_ext_views", "true");
  params.set("include_entities", "true");
  params.set("include_user_entities", "true");
  params.set("include_ext_media_color", "true");
  params.set("include_ext_media_availability", "true");
  params.set("include_ext_sensitive_media_warning", "true");
  params.set("include_ext_trusted_friends_metadata", "true");
  params.set("send_error_codes", "true");
  params.set("simple_quoted_tweet", "true");
  params.set("include_tweet_replies", `${includeTweetReplies}`);
  params.set(
    "ext",
    "mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,enrichments,superFollowMetadata,unmentionInfo,editControl,collab_control,vibe"
  );
  return params;
}

function withTransform(fetchFn, transform) {
  return async (input, init) => {
    const fetchArgs = await transform?.request?.(input, init) ?? [
      input,
      init
    ];
    const res = await fetchFn(...fetchArgs);
    return await transform?.response?.(res) ?? res;
  };
}
class TwitterGuestAuth {
  constructor(bearerToken, options) {
    this.options = options;
    this.fetch = withTransform(options?.fetch ?? fetch, options?.transform);
    this.bearerToken = bearerToken;
    this.jar = new CookieJar();
    this.v2Client = null;
  }
  cookieJar() {
    return this.jar;
  }
  getV2Client() {
    return this.v2Client ?? null;
  }
  loginWithV2(appKey, appSecret, accessToken, accessSecret) {
    const v2Client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret
    });
    this.v2Client = v2Client;
  }
  isLoggedIn() {
    return Promise.resolve(false);
  }
  async me() {
    return void 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(_username, _password, _email) {
    return this.updateGuestToken();
  }
  logout() {
    this.deleteToken();
    this.jar = new CookieJar();
    return Promise.resolve();
  }
  deleteToken() {
    delete this.guestToken;
    delete this.guestCreatedAt;
  }
  hasToken() {
    return this.guestToken != null;
  }
  authenticatedAt() {
    if (this.guestCreatedAt == null) {
      return null;
    }
    return new Date(this.guestCreatedAt);
  }
  async installTo(headers) {
    if (this.shouldUpdate()) {
      await this.updateGuestToken();
    }
    const token = this.guestToken;
    if (token == null) {
      throw new Error("Authentication token is null or undefined.");
    }
    headers.set("authorization", `Bearer ${this.bearerToken}`);
    headers.set("x-guest-token", token);
    const cookies = await this.getCookies();
    const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
    if (xCsrfToken) {
      headers.set("x-csrf-token", xCsrfToken.value);
    }
    headers.set("cookie", await this.getCookieString());
  }
  getCookies() {
    return this.jar.getCookies(this.getCookieJarUrl());
  }
  getCookieString() {
    return this.jar.getCookieString(this.getCookieJarUrl());
  }
  async removeCookie(key) {
    const store = this.jar.store;
    const cookies = await this.jar.getCookies(this.getCookieJarUrl());
    for (const cookie of cookies) {
      if (!cookie.domain || !cookie.path) continue;
      store.removeCookie(cookie.domain, cookie.path, key);
      if (typeof document !== "undefined") {
        document.cookie = `${cookie.key}=; Max-Age=0; path=${cookie.path}; domain=${cookie.domain}`;
      }
    }
  }
  getCookieJarUrl() {
    return typeof document !== "undefined" ? document.location.toString() : "https://twitter.com";
  }
  /**
   * Updates the authentication state with a new guest token from the Twitter API.
   */
  async updateGuestToken() {
    const guestActivateUrl = "https://api.twitter.com/1.1/guest/activate.json";
    const headers = new Headers$1({
      Authorization: `Bearer ${this.bearerToken}`,
      Cookie: await this.getCookieString()
    });
    const res = await this.fetch(guestActivateUrl, {
      method: "POST",
      headers,
      referrerPolicy: "no-referrer"
    });
    await updateCookieJar(this.jar, res.headers);
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const o = await res.json();
    if (o == null || o["guest_token"] == null) {
      throw new Error("guest_token not found.");
    }
    const newGuestToken = o["guest_token"];
    if (typeof newGuestToken !== "string") {
      throw new Error("guest_token was not a string.");
    }
    this.guestToken = newGuestToken;
    this.guestCreatedAt = /* @__PURE__ */ new Date();
  }
  /**
   * Returns if the authentication token needs to be updated or not.
   * @returns `true` if the token needs to be updated; `false` otherwise.
   */
  shouldUpdate() {
    return !this.hasToken() || this.guestCreatedAt != null && this.guestCreatedAt < new Date((/* @__PURE__ */ new Date()).valueOf() - 3 * 60 * 60 * 1e3);
  }
}

function getAvatarOriginalSizeUrl(avatarUrl) {
  return avatarUrl ? avatarUrl.replace("_normal", "") : void 0;
}
function parseProfile(user, isBlueVerified) {
  const profile = {
    avatar: getAvatarOriginalSizeUrl(user.profile_image_url_https),
    banner: user.profile_banner_url,
    biography: user.description,
    followersCount: user.followers_count,
    followingCount: user.friends_count,
    friendsCount: user.friends_count,
    mediaCount: user.media_count,
    isPrivate: user.protected ?? false,
    isVerified: user.verified,
    likesCount: user.favourites_count,
    listedCount: user.listed_count,
    location: user.location,
    name: user.name,
    pinnedTweetIds: user.pinned_tweet_ids_str,
    tweetsCount: user.statuses_count,
    url: `https://twitter.com/${user.screen_name}`,
    userId: user.id_str,
    username: user.screen_name,
    isBlueVerified: isBlueVerified ?? false,
    canDm: user.can_dm
  };
  if (user.created_at != null) {
    profile.joined = new Date(Date.parse(user.created_at));
  }
  const urls = user.entities?.url?.urls;
  if (urls?.length != null && urls?.length > 0) {
    profile.website = urls[0].expanded_url;
  }
  return profile;
}
async function getProfile(username, auth) {
  const params = new URLSearchParams();
  params.set(
    "variables",
    stringify({
      screen_name: username,
      withSafetyModeUserFields: true
    }) ?? ""
  );
  params.set(
    "features",
    stringify({
      hidden_profile_likes_enabled: false,
      hidden_profile_subscriptions_enabled: false,
      // Auth-restricted
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: false,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    }) ?? ""
  );
  params.set("fieldToggles", stringify({ withAuxiliaryUserLabels: false }) ?? "");
  const res = await requestApi(
    `https://twitter.com/i/api/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName?${params.toString()}`,
    auth
  );
  if (!res.success) {
    return res;
  }
  const { value } = res;
  const { errors } = value;
  if (errors != null && errors.length > 0) {
    return {
      success: false,
      err: new Error(errors[0].message)
    };
  }
  if (!value.data || !value.data.user || !value.data.user.result) {
    return {
      success: false,
      err: new Error("User not found.")
    };
  }
  const { result: user } = value.data.user;
  const { legacy } = user;
  if (user.rest_id == null || user.rest_id.length === 0) {
    return {
      success: false,
      err: new Error("rest_id not found.")
    };
  }
  legacy.id_str = user.rest_id;
  if (legacy.screen_name == null || legacy.screen_name.length === 0) {
    return {
      success: false,
      err: new Error(`Either ${username} does not exist or is private.`)
    };
  }
  return {
    success: true,
    value: parseProfile(user.legacy, user.is_blue_verified)
  };
}
const idCache = /* @__PURE__ */ new Map();
async function getScreenNameByUserId(userId, auth) {
  const params = new URLSearchParams();
  params.set(
    "variables",
    stringify({
      userId,
      withSafetyModeUserFields: true
    }) ?? ""
  );
  params.set(
    "features",
    stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    }) ?? ""
  );
  const res = await requestApi(
    `https://twitter.com/i/api/graphql/xf3jd90KKBCUxdlI_tNHZw/UserByRestId?${params.toString()}`,
    auth
  );
  if (!res.success) {
    return res;
  }
  const { value } = res;
  const { errors } = value;
  if (errors != null && errors.length > 0) {
    return {
      success: false,
      err: new Error(errors[0].message)
    };
  }
  if (!value.data || !value.data.user || !value.data.user.result) {
    return {
      success: false,
      err: new Error("User not found.")
    };
  }
  const { result: user } = value.data.user;
  const { legacy } = user;
  if (legacy.screen_name == null || legacy.screen_name.length === 0) {
    return {
      success: false,
      err: new Error(
        `Either user with ID ${userId} does not exist or is private.`
      )
    };
  }
  return {
    success: true,
    value: legacy.screen_name
  };
}
async function getUserIdByScreenName(screenName, auth) {
  const cached = idCache.get(screenName);
  if (cached != null) {
    return { success: true, value: cached };
  }
  const profileRes = await getProfile(screenName, auth);
  if (!profileRes.success) {
    return profileRes;
  }
  const profile = profileRes.value;
  if (profile.userId != null) {
    idCache.set(screenName, profile.userId);
    return {
      success: true,
      value: profile.userId
    };
  }
  return {
    success: false,
    err: new Error("User ID is undefined.")
  };
}

const TwitterUserAuthSubtask = Type.Object({
  subtask_id: Type.String(),
  enter_text: Type.Optional(Type.Object({}))
});
class TwitterUserAuth extends TwitterGuestAuth {
  constructor(bearerToken, options) {
    super(bearerToken, options);
  }
  async isLoggedIn() {
    const res = await requestApi(
      "https://api.twitter.com/1.1/account/verify_credentials.json",
      this
    );
    if (!res.success) {
      return false;
    }
    const { value: verify } = res;
    this.userProfile = parseProfile(
      verify,
      verify.verified
    );
    return verify && !verify.errors?.length;
  }
  async me() {
    if (this.userProfile) {
      return this.userProfile;
    }
    await this.isLoggedIn();
    return this.userProfile;
  }
  async login(username, password, email, twoFactorSecret, appKey, appSecret, accessToken, accessSecret) {
    await this.updateGuestToken();
    let next = await this.initLogin();
    while ("subtask" in next && next.subtask) {
      if (next.subtask.subtask_id === "LoginJsInstrumentationSubtask") {
        next = await this.handleJsInstrumentationSubtask(next);
      } else if (next.subtask.subtask_id === "LoginEnterUserIdentifierSSO") {
        next = await this.handleEnterUserIdentifierSSO(next, username);
      } else if (next.subtask.subtask_id === "LoginEnterAlternateIdentifierSubtask") {
        next = await this.handleEnterAlternateIdentifierSubtask(
          next,
          email
        );
      } else if (next.subtask.subtask_id === "LoginEnterPassword") {
        next = await this.handleEnterPassword(next, password);
      } else if (next.subtask.subtask_id === "AccountDuplicationCheck") {
        next = await this.handleAccountDuplicationCheck(next);
      } else if (next.subtask.subtask_id === "LoginTwoFactorAuthChallenge") {
        if (twoFactorSecret) {
          next = await this.handleTwoFactorAuthChallenge(next, twoFactorSecret);
        } else {
          throw new Error(
            "Requested two factor authentication code but no secret provided"
          );
        }
      } else if (next.subtask.subtask_id === "LoginAcid") {
        next = await this.handleAcid(next, email);
      } else if (next.subtask.subtask_id === "LoginSuccessSubtask") {
        next = await this.handleSuccessSubtask(next);
      } else {
        throw new Error(`Unknown subtask ${next.subtask.subtask_id}`);
      }
    }
    if (appKey && appSecret && accessToken && accessSecret) {
      this.loginWithV2(appKey, appSecret, accessToken, accessSecret);
    }
    if ("err" in next) {
      throw next.err;
    }
  }
  async logout() {
    if (!this.isLoggedIn()) {
      return;
    }
    await requestApi(
      "https://api.twitter.com/1.1/account/logout.json",
      this,
      "POST"
    );
    this.deleteToken();
    this.jar = new CookieJar();
  }
  async installCsrfToken(headers) {
    const cookies = await this.getCookies();
    const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
    if (xCsrfToken) {
      headers.set("x-csrf-token", xCsrfToken.value);
    }
  }
  async installTo(headers) {
    headers.set("authorization", `Bearer ${this.bearerToken}`);
    headers.set("cookie", await this.getCookieString());
    await this.installCsrfToken(headers);
  }
  async initLogin() {
    this.removeCookie("twitter_ads_id=");
    this.removeCookie("ads_prefs=");
    this.removeCookie("_twitter_sess=");
    this.removeCookie("zipbox_forms_auth_token=");
    this.removeCookie("lang=");
    this.removeCookie("bouncer_reset_cookie=");
    this.removeCookie("twid=");
    this.removeCookie("twitter_ads_idb=");
    this.removeCookie("email_uid=");
    this.removeCookie("external_referer=");
    this.removeCookie("ct0=");
    this.removeCookie("aa_u=");
    return await this.executeFlowTask({
      flow_name: "login",
      input_flow_data: {
        flow_context: {
          debug_overrides: {},
          start_location: {
            location: "splash_screen"
          }
        }
      }
    });
  }
  async handleJsInstrumentationSubtask(prev) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "LoginJsInstrumentationSubtask",
          js_instrumentation: {
            response: "{}",
            link: "next_link"
          }
        }
      ]
    });
  }
  async handleEnterAlternateIdentifierSubtask(prev, email) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "LoginEnterAlternateIdentifierSubtask",
          enter_text: {
            text: email,
            link: "next_link"
          }
        }
      ]
    });
  }
  async handleEnterUserIdentifierSSO(prev, username) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "LoginEnterUserIdentifierSSO",
          settings_list: {
            setting_responses: [
              {
                key: "user_identifier",
                response_data: {
                  text_data: { result: username }
                }
              }
            ],
            link: "next_link"
          }
        }
      ]
    });
  }
  async handleEnterPassword(prev, password) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "LoginEnterPassword",
          enter_password: {
            password,
            link: "next_link"
          }
        }
      ]
    });
  }
  async handleAccountDuplicationCheck(prev) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "AccountDuplicationCheck",
          check_logged_in_account: {
            link: "AccountDuplicationCheck_false"
          }
        }
      ]
    });
  }
  async handleTwoFactorAuthChallenge(prev, secret) {
    const totp = new OTPAuth.TOTP({ secret });
    let error;
    for (let attempts = 1; attempts < 4; attempts += 1) {
      try {
        return await this.executeFlowTask({
          flow_token: prev.flowToken,
          subtask_inputs: [
            {
              subtask_id: "LoginTwoFactorAuthChallenge",
              enter_text: {
                link: "next_link",
                text: totp.generate()
              }
            }
          ]
        });
      } catch (err) {
        error = err;
        await new Promise((resolve) => setTimeout(resolve, 2e3 * attempts));
      }
    }
    throw error;
  }
  async handleAcid(prev, email) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: [
        {
          subtask_id: "LoginAcid",
          enter_text: {
            text: email,
            link: "next_link"
          }
        }
      ]
    });
  }
  async handleSuccessSubtask(prev) {
    return await this.executeFlowTask({
      flow_token: prev.flowToken,
      subtask_inputs: []
    });
  }
  async executeFlowTask(data) {
    const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
    const token = this.guestToken;
    if (token == null) {
      throw new Error("Authentication token is null or undefined.");
    }
    const headers = new Headers$1({
      authorization: `Bearer ${this.bearerToken}`,
      cookie: await this.getCookieString(),
      "content-type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
      "x-guest-token": token,
      "x-twitter-auth-type": "OAuth2Client",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en"
    });
    await this.installCsrfToken(headers);
    const res = await this.fetch(onboardingTaskUrl, {
      credentials: "include",
      method: "POST",
      headers,
      body: JSON.stringify(data)
    });
    await updateCookieJar(this.jar, res.headers);
    if (!res.ok) {
      return { status: "error", err: new Error(await res.text()) };
    }
    const flow = await res.json();
    if (flow?.flow_token == null) {
      return { status: "error", err: new Error("flow_token not found.") };
    }
    if (flow.errors?.length) {
      return {
        status: "error",
        err: new Error(
          `Authentication error (${flow.errors[0].code}): ${flow.errors[0].message}`
        )
      };
    }
    if (typeof flow.flow_token !== "string") {
      return {
        status: "error",
        err: new Error("flow_token was not a string.")
      };
    }
    const subtask = flow.subtasks?.length ? flow.subtasks[0] : void 0;
    Check(TwitterUserAuthSubtask, subtask);
    if (subtask && subtask.subtask_id === "DenyLoginSubtask") {
      return {
        status: "error",
        err: new Error("Authentication error: DenyLoginSubtask")
      };
    }
    return {
      status: "success",
      subtask,
      flowToken: flow.flow_token
    };
  }
}

async function* getUserTimeline(query, maxProfiles, fetchFunc) {
  let nProfiles = 0;
  let cursor = void 0;
  let consecutiveEmptyBatches = 0;
  while (nProfiles < maxProfiles) {
    const batch = await fetchFunc(
      query,
      maxProfiles,
      cursor
    );
    const { profiles, next } = batch;
    cursor = next;
    if (profiles.length === 0) {
      consecutiveEmptyBatches++;
      if (consecutiveEmptyBatches > 5) break;
    } else consecutiveEmptyBatches = 0;
    for (const profile of profiles) {
      if (nProfiles < maxProfiles) yield profile;
      else break;
      nProfiles++;
    }
    if (!next) break;
  }
}
async function* getTweetTimeline(query, maxTweets, fetchFunc) {
  let nTweets = 0;
  let cursor = void 0;
  while (nTweets < maxTweets) {
    const batch = await fetchFunc(
      query,
      maxTweets,
      cursor
    );
    const { tweets, next } = batch;
    if (tweets.length === 0) {
      break;
    }
    for (const tweet of tweets) {
      if (nTweets < maxTweets) {
        cursor = next;
        yield tweet;
      } else {
        break;
      }
      nTweets++;
    }
  }
}

function isFieldDefined(key) {
  return function(value) {
    return isDefined(value[key]);
  };
}
function isDefined(value) {
  return value != null;
}

const reHashtag = /\B(\#\S+\b)/g;
const reCashtag = /\B(\$\S+\b)/g;
const reTwitterUrl = /https:(\/\/t\.co\/([A-Za-z0-9]|[A-Za-z]){10})/g;
const reUsername = /\B(\@\S{1,15}\b)/g;
function parseMediaGroups(media) {
  const photos = [];
  const videos = [];
  let sensitiveContent = void 0;
  for (const m of media.filter(isFieldDefined("id_str")).filter(isFieldDefined("media_url_https"))) {
    if (m.type === "photo") {
      photos.push({
        id: m.id_str,
        url: m.media_url_https,
        alt_text: m.ext_alt_text
      });
    } else if (m.type === "video") {
      videos.push(parseVideo(m));
    }
    const sensitive = m.ext_sensitive_media_warning;
    if (sensitive != null) {
      sensitiveContent = sensitive.adult_content || sensitive.graphic_violence || sensitive.other;
    }
  }
  return { sensitiveContent, photos, videos };
}
function parseVideo(m) {
  const video = {
    id: m.id_str,
    preview: m.media_url_https
  };
  let maxBitrate = 0;
  const variants = m.video_info?.variants ?? [];
  for (const variant of variants) {
    const bitrate = variant.bitrate;
    if (bitrate != null && bitrate > maxBitrate && variant.url != null) {
      let variantUrl = variant.url;
      const stringStart = 0;
      const tagSuffixIdx = variantUrl.indexOf("?tag=10");
      if (tagSuffixIdx !== -1) {
        variantUrl = variantUrl.substring(stringStart, tagSuffixIdx + 1);
      }
      video.url = variantUrl;
      maxBitrate = bitrate;
    }
  }
  return video;
}
function reconstructTweetHtml(tweet, photos, videos) {
  const media = [];
  let html = tweet.full_text ?? "";
  html = html.replace(reHashtag, linkHashtagHtml);
  html = html.replace(reCashtag, linkCashtagHtml);
  html = html.replace(reUsername, linkUsernameHtml);
  html = html.replace(reTwitterUrl, unwrapTcoUrlHtml(tweet, media));
  for (const { url } of photos) {
    if (media.indexOf(url) !== -1) {
      continue;
    }
    html += `<br><img src="${url}"/>`;
  }
  for (const { preview: url } of videos) {
    if (media.indexOf(url) !== -1) {
      continue;
    }
    html += `<br><img src="${url}"/>`;
  }
  html = html.replace(/\n/g, "<br>");
  return html;
}
function linkHashtagHtml(hashtag) {
  return `<a href="https://twitter.com/hashtag/${hashtag.replace(
    "#",
    ""
  )}">${hashtag}</a>`;
}
function linkCashtagHtml(cashtag) {
  return `<a href="https://twitter.com/search?q=%24${cashtag.replace(
    "$",
    ""
  )}">${cashtag}</a>`;
}
function linkUsernameHtml(username) {
  return `<a href="https://twitter.com/${username.replace(
    "@",
    ""
  )}">${username}</a>`;
}
function unwrapTcoUrlHtml(tweet, foundedMedia) {
  return function(tco) {
    for (const entity of tweet.entities?.urls ?? []) {
      if (tco === entity.url && entity.expanded_url != null) {
        return `<a href="${entity.expanded_url}">${tco}</a>`;
      }
    }
    for (const entity of tweet.extended_entities?.media ?? []) {
      if (tco === entity.url && entity.media_url_https != null) {
        foundedMedia.push(entity.media_url_https);
        return `<br><a href="${tco}"><img src="${entity.media_url_https}"/></a>`;
      }
    }
    return tco;
  };
}

function parseLegacyTweet(user, tweet) {
  if (tweet == null) {
    return {
      success: false,
      err: new Error("Tweet was not found in the timeline object.")
    };
  }
  if (user == null) {
    return {
      success: false,
      err: new Error("User was not found in the timeline object.")
    };
  }
  if (!tweet.id_str) {
    if (!tweet.conversation_id_str) {
      return {
        success: false,
        err: new Error("Tweet ID was not found in object.")
      };
    }
    tweet.id_str = tweet.conversation_id_str;
  }
  const hashtags = tweet.entities?.hashtags ?? [];
  const mentions = tweet.entities?.user_mentions ?? [];
  const media = tweet.extended_entities?.media ?? [];
  const pinnedTweets = new Set(
    user.pinned_tweet_ids_str ?? []
  );
  const urls = tweet.entities?.urls ?? [];
  const { photos, videos, sensitiveContent } = parseMediaGroups(media);
  const tw = {
    bookmarkCount: tweet.bookmark_count,
    conversationId: tweet.conversation_id_str,
    id: tweet.id_str,
    hashtags: hashtags.filter(isFieldDefined("text")).map((hashtag) => hashtag.text),
    likes: tweet.favorite_count,
    mentions: mentions.filter(isFieldDefined("id_str")).map((mention) => ({
      id: mention.id_str,
      username: mention.screen_name,
      name: mention.name
    })),
    name: user.name,
    permanentUrl: `https://twitter.com/${user.screen_name}/status/${tweet.id_str}`,
    photos,
    replies: tweet.reply_count,
    retweets: tweet.retweet_count,
    text: tweet.full_text,
    thread: [],
    urls: urls.filter(isFieldDefined("expanded_url")).map((url) => url.expanded_url),
    userId: tweet.user_id_str,
    username: user.screen_name,
    videos,
    isQuoted: false,
    isReply: false,
    isRetweet: false,
    isPin: false,
    sensitiveContent: false
  };
  if (tweet.created_at) {
    tw.timeParsed = new Date(Date.parse(tweet.created_at));
    tw.timestamp = Math.floor(tw.timeParsed.valueOf() / 1e3);
  }
  if (tweet.place?.id) {
    tw.place = tweet.place;
  }
  const quotedStatusIdStr = tweet.quoted_status_id_str;
  const inReplyToStatusIdStr = tweet.in_reply_to_status_id_str;
  const retweetedStatusIdStr = tweet.retweeted_status_id_str;
  const retweetedStatusResult = tweet.retweeted_status_result?.result;
  if (quotedStatusIdStr) {
    tw.isQuoted = true;
    tw.quotedStatusId = quotedStatusIdStr;
  }
  if (inReplyToStatusIdStr) {
    tw.isReply = true;
    tw.inReplyToStatusId = inReplyToStatusIdStr;
  }
  if (retweetedStatusIdStr || retweetedStatusResult) {
    tw.isRetweet = true;
    tw.retweetedStatusId = retweetedStatusIdStr;
    if (retweetedStatusResult) {
      const parsedResult = parseLegacyTweet(
        retweetedStatusResult?.core?.user_results?.result?.legacy,
        retweetedStatusResult?.legacy
      );
      if (parsedResult.success) {
        tw.retweetedStatus = parsedResult.tweet;
      }
    }
  }
  const views = parseInt(tweet.ext_views?.count ?? "");
  if (!isNaN(views)) {
    tw.views = views;
  }
  if (pinnedTweets.has(tweet.id_str)) {
    tw.isPin = true;
  }
  if (sensitiveContent) {
    tw.sensitiveContent = true;
  }
  tw.html = reconstructTweetHtml(tweet, tw.photos, tw.videos);
  return { success: true, tweet: tw };
}
function parseResult(result) {
  const noteTweetResultText = result?.note_tweet?.note_tweet_results?.result?.text;
  if (result?.legacy && noteTweetResultText) {
    result.legacy.full_text = noteTweetResultText;
  }
  const tweetResult = parseLegacyTweet(
    result?.core?.user_results?.result?.legacy,
    result?.legacy
  );
  if (!tweetResult.success) {
    return tweetResult;
  }
  if (!tweetResult.tweet.views && result?.views?.count) {
    const views = parseInt(result.views.count);
    if (!isNaN(views)) {
      tweetResult.tweet.views = views;
    }
  }
  const quotedResult = result?.quoted_status_result?.result;
  if (quotedResult) {
    if (quotedResult.legacy && quotedResult.rest_id) {
      quotedResult.legacy.id_str = quotedResult.rest_id;
    }
    const quotedTweetResult = parseResult(quotedResult);
    if (quotedTweetResult.success) {
      tweetResult.tweet.quotedStatus = quotedTweetResult.tweet;
    }
  }
  return tweetResult;
}
const expectedEntryTypes = ["tweet", "profile-conversation"];
function parseTimelineTweetsV2(timeline) {
  let bottomCursor;
  let topCursor;
  const tweets = [];
  const instructions = timeline.data?.user?.result?.timeline_v2?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      const entryContent = entry.content;
      if (!entryContent) continue;
      if (entryContent.cursorType === "Bottom") {
        bottomCursor = entryContent.value;
        continue;
      } else if (entryContent.cursorType === "Top") {
        topCursor = entryContent.value;
        continue;
      }
      const idStr = entry.entryId;
      if (!expectedEntryTypes.some((entryType) => idStr.startsWith(entryType))) {
        continue;
      }
      if (entryContent.itemContent) {
        parseAndPush(tweets, entryContent.itemContent, idStr);
      } else if (entryContent.items) {
        for (const item of entryContent.items) {
          if (item.item?.itemContent) {
            parseAndPush(tweets, item.item.itemContent, idStr);
          }
        }
      }
    }
  }
  return { tweets, next: bottomCursor, previous: topCursor };
}
function parseTimelineEntryItemContentRaw(content, entryId, isConversation = false) {
  let result = content.tweet_results?.result ?? content.tweetResult?.result;
  if (result?.__typename === "Tweet" || result?.__typename === "TweetWithVisibilityResults" && result?.tweet) {
    if (result?.__typename === "TweetWithVisibilityResults")
      result = result.tweet;
    if (result?.legacy) {
      result.legacy.id_str = result.rest_id ?? entryId.replace("conversation-", "").replace("tweet-", "");
    }
    const tweetResult = parseResult(result);
    if (tweetResult.success) {
      if (isConversation) {
        if (content?.tweetDisplayType === "SelfThread") {
          tweetResult.tweet.isSelfThread = true;
        }
      }
      return tweetResult.tweet;
    }
  }
  return null;
}
function parseAndPush(tweets, content, entryId, isConversation = false) {
  const tweet = parseTimelineEntryItemContentRaw(
    content,
    entryId,
    isConversation
  );
  if (tweet) {
    tweets.push(tweet);
  }
}
function parseThreadedConversation(conversation) {
  const tweets = [];
  const instructions = conversation.data?.threaded_conversation_with_injections_v2?.instructions ?? [];
  for (const instruction of instructions) {
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      const entryContent = entry.content?.itemContent;
      if (entryContent) {
        parseAndPush(tweets, entryContent, entry.entryId, true);
      }
      for (const item of entry.content?.items ?? []) {
        const itemContent = item.item?.itemContent;
        if (itemContent) {
          parseAndPush(tweets, itemContent, entry.entryId, true);
        }
      }
    }
  }
  for (const tweet of tweets) {
    if (tweet.inReplyToStatusId) {
      for (const parentTweet of tweets) {
        if (parentTweet.id === tweet.inReplyToStatusId) {
          tweet.inReplyToStatus = parentTweet;
          break;
        }
      }
    }
    if (tweet.isSelfThread && tweet.conversationId === tweet.id) {
      for (const childTweet of tweets) {
        if (childTweet.isSelfThread && childTweet.id !== tweet.id) {
          tweet.thread.push(childTweet);
        }
      }
      if (tweet.thread.length === 0) {
        tweet.isSelfThread = false;
      }
    }
  }
  return tweets;
}

function parseSearchTimelineTweets(timeline) {
  let bottomCursor;
  let topCursor;
  const tweets = [];
  const instructions = timeline.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    if (instruction.type === "TimelineAddEntries" || instruction.type === "TimelineReplaceEntry") {
      if (instruction.entry?.content?.cursorType === "Bottom") {
        bottomCursor = instruction.entry.content.value;
        continue;
      } else if (instruction.entry?.content?.cursorType === "Top") {
        topCursor = instruction.entry.content.value;
        continue;
      }
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        const itemContent = entry.content?.itemContent;
        if (itemContent?.tweetDisplayType === "Tweet") {
          const tweetResultRaw = itemContent.tweet_results?.result;
          const tweetResult = parseLegacyTweet(
            tweetResultRaw?.core?.user_results?.result?.legacy,
            tweetResultRaw?.legacy
          );
          if (tweetResult.success) {
            if (!tweetResult.tweet.views && tweetResultRaw?.views?.count) {
              const views = parseInt(tweetResultRaw.views.count);
              if (!isNaN(views)) {
                tweetResult.tweet.views = views;
              }
            }
            tweets.push(tweetResult.tweet);
          }
        } else if (entry.content?.cursorType === "Bottom") {
          bottomCursor = entry.content.value;
        } else if (entry.content?.cursorType === "Top") {
          topCursor = entry.content.value;
        }
      }
    }
  }
  return { tweets, next: bottomCursor, previous: topCursor };
}
function parseSearchTimelineUsers(timeline) {
  let bottomCursor;
  let topCursor;
  const profiles = [];
  const instructions = timeline.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    if (instruction.type === "TimelineAddEntries" || instruction.type === "TimelineReplaceEntry") {
      if (instruction.entry?.content?.cursorType === "Bottom") {
        bottomCursor = instruction.entry.content.value;
        continue;
      } else if (instruction.entry?.content?.cursorType === "Top") {
        topCursor = instruction.entry.content.value;
        continue;
      }
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        const itemContent = entry.content?.itemContent;
        if (itemContent?.userDisplayType === "User") {
          const userResultRaw = itemContent.user_results?.result;
          if (userResultRaw?.legacy) {
            const profile = parseProfile(
              userResultRaw.legacy,
              userResultRaw.is_blue_verified
            );
            if (!profile.userId) {
              profile.userId = userResultRaw.rest_id;
            }
            profiles.push(profile);
          }
        } else if (entry.content?.cursorType === "Bottom") {
          bottomCursor = entry.content.value;
        } else if (entry.content?.cursorType === "Top") {
          topCursor = entry.content.value;
        }
      }
    }
  }
  return { profiles, next: bottomCursor, previous: topCursor };
}

var SearchMode = /* @__PURE__ */ ((SearchMode2) => {
  SearchMode2[SearchMode2["Top"] = 0] = "Top";
  SearchMode2[SearchMode2["Latest"] = 1] = "Latest";
  SearchMode2[SearchMode2["Photos"] = 2] = "Photos";
  SearchMode2[SearchMode2["Videos"] = 3] = "Videos";
  SearchMode2[SearchMode2["Users"] = 4] = "Users";
  return SearchMode2;
})(SearchMode || {});
function searchTweets(query, maxTweets, searchMode, auth) {
  return getTweetTimeline(query, maxTweets, (q, mt, c) => {
    return fetchSearchTweets(q, mt, searchMode, auth, c);
  });
}
function searchProfiles(query, maxProfiles, auth) {
  return getUserTimeline(query, maxProfiles, (q, mt, c) => {
    return fetchSearchProfiles(q, mt, auth, c);
  });
}
async function fetchSearchTweets(query, maxTweets, searchMode, auth, cursor) {
  const timeline = await getSearchTimeline(
    query,
    maxTweets,
    searchMode,
    auth,
    cursor
  );
  return parseSearchTimelineTweets(timeline);
}
async function fetchSearchProfiles(query, maxProfiles, auth, cursor) {
  const timeline = await getSearchTimeline(
    query,
    maxProfiles,
    4 /* Users */,
    auth,
    cursor
  );
  return parseSearchTimelineUsers(timeline);
}
async function getSearchTimeline(query, maxItems, searchMode, auth, cursor) {
  if (!auth.isLoggedIn()) {
    throw new Error("Scraper is not logged-in for search.");
  }
  if (maxItems > 50) {
    maxItems = 50;
  }
  const variables = {
    rawQuery: query,
    count: maxItems,
    querySource: "typed_query",
    product: "Top"
  };
  const features = addApiFeatures({
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
    responsive_web_media_download_video_enabled: false,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    interactive_text_enabled: false,
    responsive_web_text_conversations_enabled: false,
    vibe_api_enabled: false
  });
  const fieldToggles = {
    withArticleRichContentState: false
  };
  if (cursor != null && cursor != "") {
    variables["cursor"] = cursor;
  }
  switch (searchMode) {
    case 1 /* Latest */:
      variables.product = "Latest";
      break;
    case 2 /* Photos */:
      variables.product = "Photos";
      break;
    case 3 /* Videos */:
      variables.product = "Videos";
      break;
    case 4 /* Users */:
      variables.product = "People";
      break;
  }
  const params = new URLSearchParams();
  params.set("features", stringify(features) ?? "");
  params.set("fieldToggles", stringify(fieldToggles) ?? "");
  params.set("variables", stringify(variables) ?? "");
  const res = await requestApi(
    `https://api.twitter.com/graphql/gkjsKepM6gl_HmFWoWKfgg/SearchTimeline?${params.toString()}`,
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return res.value;
}

function parseRelationshipTimeline(timeline) {
  let bottomCursor;
  let topCursor;
  const profiles = [];
  const instructions = timeline.data?.user?.result?.timeline?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    if (instruction.type === "TimelineAddEntries" || instruction.type === "TimelineReplaceEntry") {
      if (instruction.entry?.content?.cursorType === "Bottom") {
        bottomCursor = instruction.entry.content.value;
        continue;
      }
      if (instruction.entry?.content?.cursorType === "Top") {
        topCursor = instruction.entry.content.value;
        continue;
      }
      const entries = instruction.entries ?? [];
      for (const entry of entries) {
        const itemContent = entry.content?.itemContent;
        if (itemContent?.userDisplayType === "User") {
          const userResultRaw = itemContent.user_results?.result;
          if (userResultRaw?.legacy) {
            const profile = parseProfile(
              userResultRaw.legacy,
              userResultRaw.is_blue_verified
            );
            if (!profile.userId) {
              profile.userId = userResultRaw.rest_id;
            }
            profiles.push(profile);
          }
        } else if (entry.content?.cursorType === "Bottom") {
          bottomCursor = entry.content.value;
        } else if (entry.content?.cursorType === "Top") {
          topCursor = entry.content.value;
        }
      }
    }
  }
  return { profiles, next: bottomCursor, previous: topCursor };
}

function getFollowing(userId, maxProfiles, auth) {
  return getUserTimeline(userId, maxProfiles, (q, mt, c) => {
    return fetchProfileFollowing(q, mt, auth, c);
  });
}
function getFollowers(userId, maxProfiles, auth) {
  return getUserTimeline(userId, maxProfiles, (q, mt, c) => {
    return fetchProfileFollowers(q, mt, auth, c);
  });
}
async function fetchProfileFollowing(userId, maxProfiles, auth, cursor) {
  const timeline = await getFollowingTimeline(
    userId,
    maxProfiles,
    auth,
    cursor
  );
  return parseRelationshipTimeline(timeline);
}
async function fetchProfileFollowers(userId, maxProfiles, auth, cursor) {
  const timeline = await getFollowersTimeline(
    userId,
    maxProfiles,
    auth,
    cursor
  );
  return parseRelationshipTimeline(timeline);
}
async function getFollowingTimeline(userId, maxItems, auth, cursor) {
  if (!auth.isLoggedIn()) {
    throw new Error("Scraper is not logged-in for profile following.");
  }
  if (maxItems > 50) {
    maxItems = 50;
  }
  const variables = {
    userId,
    count: maxItems,
    includePromotedContent: false
  };
  const features = addApiFeatures({
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_media_download_video_enabled: false
  });
  if (cursor != null && cursor != "") {
    variables["cursor"] = cursor;
  }
  const params = new URLSearchParams();
  params.set("features", stringify(features) ?? "");
  params.set("variables", stringify(variables) ?? "");
  const res = await requestApi(
    `https://twitter.com/i/api/graphql/iSicc7LrzWGBgDPL0tM_TQ/Following?${params.toString()}`,
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return res.value;
}
async function getFollowersTimeline(userId, maxItems, auth, cursor) {
  if (!auth.isLoggedIn()) {
    throw new Error("Scraper is not logged-in for profile followers.");
  }
  if (maxItems > 50) {
    maxItems = 50;
  }
  const variables = {
    userId,
    count: maxItems,
    includePromotedContent: false
  };
  const features = addApiFeatures({
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_media_download_video_enabled: false
  });
  if (cursor != null && cursor != "") {
    variables["cursor"] = cursor;
  }
  const params = new URLSearchParams();
  params.set("features", stringify(features) ?? "");
  params.set("variables", stringify(variables) ?? "");
  const res = await requestApi(
    `https://twitter.com/i/api/graphql/rRXFSG5vR6drKr5M37YOTw/Followers?${params.toString()}`,
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return res.value;
}
async function followUser(username, auth) {
  if (!await auth.isLoggedIn()) {
    throw new Error("Must be logged in to follow users");
  }
  const userIdResult = await getUserIdByScreenName(username, auth);
  if (!userIdResult.success) {
    throw new Error(`Failed to get user ID: ${userIdResult.err.message}`);
  }
  const userId = userIdResult.value;
  const requestBody = {
    include_profile_interstitial_type: "1",
    skip_status: "true",
    user_id: userId
  };
  const headers = new Headers$1({
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: `https://twitter.com/${username}`,
    "X-Twitter-Active-User": "yes",
    "X-Twitter-Auth-Type": "OAuth2Session",
    "X-Twitter-Client-Language": "en",
    Authorization: `Bearer ${bearerToken}`
  });
  await auth.installTo(headers, "https://api.twitter.com/1.1/friendships/create.json");
  const res = await auth.fetch(
    "https://api.twitter.com/1.1/friendships/create.json",
    {
      method: "POST",
      headers,
      body: new URLSearchParams(requestBody).toString(),
      credentials: "include"
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to follow user: ${res.statusText}`);
  }
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function getTrends(auth) {
  const params = new URLSearchParams();
  addApiParams(params, false);
  params.set("count", "20");
  params.set("candidate_source", "trends");
  params.set("include_page_configuration", "false");
  params.set("entity_tokens", "false");
  const res = await requestApi(
    `https://api.twitter.com/2/guide.json?${params.toString()}`,
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  const instructions = res.value.timeline?.instructions ?? [];
  if (instructions.length < 2) {
    throw new Error("No trend entries found.");
  }
  const entries = instructions[1].addEntries?.entries ?? [];
  if (entries.length < 2) {
    throw new Error("No trend entries found.");
  }
  const items = entries[1].content?.timelineModule?.items ?? [];
  const trends = [];
  for (const item of items) {
    const trend = item.item?.clientEventInfo?.details?.guideDetails?.transparentGuideDetails?.trendMetadata?.trendName;
    if (trend != null) {
      trends.push(trend);
    }
  }
  return trends;
}

const endpoints = {
  // TODO: Migrate other endpoint URLs here
  UserTweets: "https://twitter.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets?variables=%7B%22userId%22%3A%224020276615%22%2C%22count%22%3A20%2C%22includePromotedContent%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticlePlainText%22%3Afalse%7D",
  UserTweetsAndReplies: "https://twitter.com/i/api/graphql/E4wA5vo2sjVyvpliUffSCw/UserTweetsAndReplies?variables=%7B%22userId%22%3A%224020276615%22%2C%22count%22%3A40%2C%22cursor%22%3A%22DAABCgABGPWl-F-ATiIKAAIY9YfiF1rRAggAAwAAAAEAAA%22%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22communities_web_enable_tweet_community_results_fetch%22%3Atrue%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22articles_preview_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22creator_subscriptions_quote_tweet_preview_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticlePlainText%22%3Afalse%7D",
  UserLikedTweets: "https://twitter.com/i/api/graphql/eSSNbhECHHWWALkkQq-YTA/Likes?variables=%7B%22userId%22%3A%222244196397%22%2C%22count%22%3A20%2C%22includePromotedContent%22%3Afalse%2C%22withClientEventToken%22%3Afalse%2C%22withBirdwatchNotes%22%3Afalse%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D",
  TweetDetail: "https://twitter.com/i/api/graphql/xOhkmRac04YFZmOzU9PJHg/TweetDetail?variables=%7B%22focalTweetId%22%3A%221237110546383724547%22%2C%22with_rux_injections%22%3Afalse%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%2C%22withV2Timeline%22%3Atrue%7D&features=%7B%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticleRichContentState%22%3Afalse%7D",
  TweetResultByRestId: "https://twitter.com/i/api/graphql/DJS3BdhUhcaEpZ7B7irJDg/TweetResultByRestId?variables=%7B%22tweetId%22%3A%221237110546383724547%22%2C%22withCommunity%22%3Afalse%2C%22includePromotedContent%22%3Afalse%2C%22withVoice%22%3Afalse%7D&features=%7B%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D",
  ListTweets: "https://twitter.com/i/api/graphql/whF0_KH1fCkdLLoyNPMoEw/ListLatestTweetsTimeline?variables=%7B%22listId%22%3A%221736495155002106192%22%2C%22count%22%3A20%7D&features=%7B%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22c9s_tweet_anatomy_moderator_badge_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22rweb_video_timestamps_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D"
};
class ApiRequest {
  constructor(info) {
    this.url = info.url;
    this.variables = info.variables;
    this.features = info.features;
    this.fieldToggles = info.fieldToggles;
  }
  toRequestUrl() {
    const params = new URLSearchParams();
    if (this.variables) {
      params.set("variables", stringify(this.variables) ?? "");
    }
    if (this.features) {
      params.set("features", stringify(this.features) ?? "");
    }
    if (this.fieldToggles) {
      params.set("fieldToggles", stringify(this.fieldToggles) ?? "");
    }
    return `${this.url}?${params.toString()}`;
  }
}
function parseEndpointExample(example) {
  const { protocol, host, pathname, searchParams: query } = new URL(example);
  const base = `${protocol}//${host}${pathname}`;
  const variables = query.get("variables");
  const features = query.get("features");
  const fieldToggles = query.get("fieldToggles");
  return new ApiRequest({
    url: base,
    variables: variables ? JSON.parse(variables) : void 0,
    features: features ? JSON.parse(features) : void 0,
    fieldToggles: fieldToggles ? JSON.parse(fieldToggles) : void 0
  });
}
function createApiRequestFactory(endpoints2) {
  return Object.entries(endpoints2).map(([endpointName, endpointExample]) => {
    return {
      [`create${endpointName}Request`]: () => {
        return parseEndpointExample(endpointExample);
      }
    };
  }).reduce((agg, next) => {
    return Object.assign(agg, next);
  });
}
const apiRequestFactory = createApiRequestFactory(endpoints);

function parseListTimelineTweets(timeline) {
  let bottomCursor;
  let topCursor;
  const tweets = [];
  const instructions = timeline.data?.list?.tweets_timeline?.timeline?.instructions ?? [];
  for (const instruction of instructions) {
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      const entryContent = entry.content;
      if (!entryContent) continue;
      if (entryContent.cursorType === "Bottom") {
        bottomCursor = entryContent.value;
        continue;
      } else if (entryContent.cursorType === "Top") {
        topCursor = entryContent.value;
        continue;
      }
      const idStr = entry.entryId;
      if (!idStr.startsWith("tweet") && !idStr.startsWith("list-conversation")) {
        continue;
      }
      if (entryContent.itemContent) {
        parseAndPush(tweets, entryContent.itemContent, idStr);
      } else if (entryContent.items) {
        for (const contentItem of entryContent.items) {
          if (contentItem.item && contentItem.item.itemContent && contentItem.entryId) {
            parseAndPush(
              tweets,
              contentItem.item.itemContent,
              contentItem.entryId.split("tweet-")[1]
            );
          }
        }
      }
    }
  }
  return { tweets, next: bottomCursor, previous: topCursor };
}

const defaultOptions = {
  expansions: [
    "attachments.poll_ids",
    "attachments.media_keys",
    "author_id",
    "referenced_tweets.id",
    "in_reply_to_user_id",
    "edit_history_tweet_ids",
    "geo.place_id",
    "entities.mentions.username",
    "referenced_tweets.id.author_id"
  ],
  tweetFields: [
    "attachments",
    "author_id",
    "context_annotations",
    "conversation_id",
    "created_at",
    "entities",
    "geo",
    "id",
    "in_reply_to_user_id",
    "lang",
    "public_metrics",
    "edit_controls",
    "possibly_sensitive",
    "referenced_tweets",
    "reply_settings",
    "source",
    "text",
    "withheld",
    "note_tweet"
  ],
  pollFields: [
    "duration_minutes",
    "end_datetime",
    "id",
    "options",
    "voting_status"
  ],
  mediaFields: [
    "duration_ms",
    "height",
    "media_key",
    "preview_image_url",
    "type",
    "url",
    "width",
    "public_metrics",
    "alt_text",
    "variants"
  ],
  userFields: [
    "created_at",
    "description",
    "entities",
    "id",
    "location",
    "name",
    "profile_image_url",
    "protected",
    "public_metrics",
    "url",
    "username",
    "verified",
    "withheld"
  ],
  placeFields: [
    "contained_within",
    "country",
    "country_code",
    "full_name",
    "geo",
    "id",
    "name",
    "place_type"
  ]
};
addApiFeatures({
  interactive_text_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_text_conversations_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
  vibe_api_enabled: false
});
async function fetchTweets(userId, maxTweets, cursor, auth) {
  if (maxTweets > 200) {
    maxTweets = 200;
  }
  const userTweetsRequest = apiRequestFactory.createUserTweetsRequest();
  userTweetsRequest.variables.userId = userId;
  userTweetsRequest.variables.count = maxTweets;
  userTweetsRequest.variables.includePromotedContent = false;
  if (cursor != null && cursor != "") {
    userTweetsRequest.variables["cursor"] = cursor;
  }
  const res = await requestApi(
    userTweetsRequest.toRequestUrl(),
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return parseTimelineTweetsV2(res.value);
}
async function fetchTweetsAndReplies(userId, maxTweets, cursor, auth) {
  if (maxTweets > 40) {
    maxTweets = 40;
  }
  const userTweetsRequest = apiRequestFactory.createUserTweetsAndRepliesRequest();
  userTweetsRequest.variables.userId = userId;
  userTweetsRequest.variables.count = maxTweets;
  userTweetsRequest.variables.includePromotedContent = false;
  if (cursor != null && cursor != "") {
    userTweetsRequest.variables["cursor"] = cursor;
  }
  const res = await requestApi(
    userTweetsRequest.toRequestUrl(),
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return parseTimelineTweetsV2(res.value);
}
async function createCreateTweetRequestV2(text, auth, tweetId, options) {
  const v2client = auth.getV2Client();
  if (v2client == null) {
    throw new Error("V2 client is not initialized");
  }
  const { poll } = options || {};
  let tweetConfig;
  if (poll) {
    tweetConfig = {
      text,
      poll: {
        options: poll?.options.map((option) => option.label) ?? [],
        duration_minutes: poll?.duration_minutes ?? 60
      }
    };
  } else if (tweetId) {
    tweetConfig = {
      text,
      reply: {
        in_reply_to_tweet_id: tweetId
      }
    };
  } else {
    tweetConfig = {
      text
    };
  }
  const tweetResponse = await v2client.v2.tweet(tweetConfig);
  let optionsConfig = {};
  if (options?.poll) {
    optionsConfig = {
      expansions: ["attachments.poll_ids"],
      pollFields: [
        "options",
        "duration_minutes",
        "end_datetime",
        "voting_status"
      ]
    };
  }
  return await getTweetV2(tweetResponse.data.id, auth, optionsConfig);
}
function parseTweetV2ToV1(tweetV2, includes, defaultTweetData) {
  let parsedTweet;
  if (defaultTweetData != null) {
    parsedTweet = defaultTweetData;
  }
  parsedTweet = {
    id: tweetV2.id,
    text: tweetV2.text ?? defaultTweetData?.text ?? "",
    hashtags: tweetV2.entities?.hashtags?.map((tag) => tag.tag) ?? defaultTweetData?.hashtags ?? [],
    mentions: tweetV2.entities?.mentions?.map((mention) => ({
      id: mention.id,
      username: mention.username
    })) ?? defaultTweetData?.mentions ?? [],
    urls: tweetV2.entities?.urls?.map((url) => url.url) ?? defaultTweetData?.urls ?? [],
    likes: tweetV2.public_metrics?.like_count ?? defaultTweetData?.likes ?? 0,
    retweets: tweetV2.public_metrics?.retweet_count ?? defaultTweetData?.retweets ?? 0,
    replies: tweetV2.public_metrics?.reply_count ?? defaultTweetData?.replies ?? 0,
    views: tweetV2.public_metrics?.impression_count ?? defaultTweetData?.views ?? 0,
    userId: tweetV2.author_id ?? defaultTweetData?.userId,
    conversationId: tweetV2.conversation_id ?? defaultTweetData?.conversationId,
    photos: defaultTweetData?.photos ?? [],
    videos: defaultTweetData?.videos ?? [],
    poll: defaultTweetData?.poll ?? null,
    username: defaultTweetData?.username ?? "",
    name: defaultTweetData?.name ?? "",
    place: defaultTweetData?.place,
    thread: defaultTweetData?.thread ?? []
  };
  if (includes?.polls?.length) {
    const poll = includes.polls[0];
    parsedTweet.poll = {
      id: poll.id,
      end_datetime: poll.end_datetime ? poll.end_datetime : defaultTweetData?.poll?.end_datetime ? defaultTweetData?.poll?.end_datetime : void 0,
      options: poll.options.map((option) => ({
        position: option.position,
        label: option.label,
        votes: option.votes
      })),
      voting_status: poll.voting_status ?? defaultTweetData?.poll?.voting_status
    };
  }
  if (includes?.media?.length) {
    includes.media.forEach((media) => {
      if (media.type === "photo") {
        parsedTweet.photos.push({
          id: media.media_key,
          url: media.url ?? "",
          alt_text: media.alt_text ?? ""
        });
      } else if (media.type === "video" || media.type === "animated_gif") {
        parsedTweet.videos.push({
          id: media.media_key,
          preview: media.preview_image_url ?? "",
          url: media.variants?.find(
            (variant) => variant.content_type === "video/mp4"
          )?.url ?? ""
        });
      }
    });
  }
  if (includes?.users?.length) {
    const user = includes.users.find(
      (user2) => user2.id === tweetV2.author_id
    );
    if (user) {
      parsedTweet.username = user.username ?? defaultTweetData?.username ?? "";
      parsedTweet.name = user.name ?? defaultTweetData?.name ?? "";
    }
  }
  if (tweetV2?.geo?.place_id && includes?.places?.length) {
    const place = includes.places.find(
      (place2) => place2.id === tweetV2?.geo?.place_id
    );
    if (place) {
      parsedTweet.place = {
        id: place.id,
        full_name: place.full_name ?? defaultTweetData?.place?.full_name ?? "",
        country: place.country ?? defaultTweetData?.place?.country ?? "",
        country_code: place.country_code ?? defaultTweetData?.place?.country_code ?? "",
        name: place.name ?? defaultTweetData?.place?.name ?? "",
        place_type: place.place_type ?? defaultTweetData?.place?.place_type
      };
    }
  }
  return parsedTweet;
}
async function createCreateTweetRequest(text, auth, tweetId, mediaData) {
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "x-csrf-token": xCsrfToken?.value
  });
  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: [],
      possibly_sensitive: false
    },
    semantic_annotation_ids: []
  };
  if (mediaData && mediaData.length > 0) {
    const mediaIds = await Promise.all(
      mediaData.map(
        ({ data, mediaType }) => uploadMedia(data, auth, mediaType)
      )
    );
    variables.media.media_entities = mediaIds.map((id) => ({
      media_id: id,
      tagged_users: []
    }));
  }
  if (tweetId) {
    variables.reply = { in_reply_to_tweet_id: tweetId };
  }
  const response = await fetch(
    "https://twitter.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet",
    {
      headers,
      body: JSON.stringify({
        variables,
        features: {
          interactive_text_enabled: true,
          longform_notetweets_inline_media_enabled: false,
          responsive_web_text_conversations_enabled: false,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          vibe_api_enabled: false,
          rweb_lists_timeline_redesign_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          creator_subscriptions_tweet_preview_api_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          longform_notetweets_rich_text_read_enabled: true,
          responsive_web_enhance_cards_enabled: false,
          subscriptions_verification_info_enabled: true,
          subscriptions_verification_info_reason_enabled: true,
          subscriptions_verification_info_verified_since_enabled: true,
          super_follow_badge_privacy_enabled: false,
          super_follow_exclusive_tweet_notifications_enabled: false,
          super_follow_tweet_api_enabled: false,
          super_follow_user_api_enabled: false,
          android_graphql_skip_api_media_color_palette: false,
          creator_subscriptions_subscription_count_enabled: false,
          blue_business_profile_image_shape_enabled: false,
          unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false,
          rweb_video_timestamps_enabled: false,
          c9s_tweet_anatomy_moderator_badge_enabled: false,
          responsive_web_twitter_article_tweet_consumption_enabled: false
        },
        fieldToggles: {}
      }),
      method: "POST"
    }
  );
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}
async function createCreateNoteTweetRequest(text, auth, tweetId, mediaData) {
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "x-csrf-token": xCsrfToken?.value
  });
  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: [],
      possibly_sensitive: false
    },
    semantic_annotation_ids: []
  };
  if (mediaData && mediaData.length > 0) {
    const mediaIds = await Promise.all(
      mediaData.map(
        ({ data: data2, mediaType }) => uploadMedia(data2, auth, mediaType)
      )
    );
    variables.media.media_entities = mediaIds.map((id) => ({
      media_id: id,
      tagged_users: []
    }));
  }
  if (tweetId) {
    variables.reply = { in_reply_to_tweet_id: tweetId };
  }
  const response = await fetch(
    "https://twitter.com/i/api/graphql/0aWhJJmFlxkxv9TAUJPanA/CreateNoteTweet",
    {
      headers,
      body: JSON.stringify({
        variables,
        features: {
          interactive_text_enabled: true,
          longform_notetweets_inline_media_enabled: false,
          responsive_web_text_conversations_enabled: false,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          vibe_api_enabled: false,
          rweb_lists_timeline_redesign_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          creator_subscriptions_tweet_preview_api_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          longform_notetweets_creation_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          longform_notetweets_rich_text_read_enabled: true,
          responsive_web_enhance_cards_enabled: false,
          subscriptions_verification_info_enabled: true,
          subscriptions_verification_info_reason_enabled: true,
          subscriptions_verification_info_verified_since_enabled: true,
          super_follow_badge_privacy_enabled: false,
          super_follow_exclusive_tweet_notifications_enabled: false,
          super_follow_tweet_api_enabled: false,
          super_follow_user_api_enabled: false,
          android_graphql_skip_api_media_color_palette: false,
          creator_subscriptions_subscription_count_enabled: false,
          blue_business_profile_image_shape_enabled: false,
          unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false,
          rweb_video_timestamps_enabled: false,
          c9s_tweet_anatomy_moderator_badge_enabled: false,
          responsive_web_twitter_article_tweet_consumption_enabled: false,
          communities_web_enable_tweet_community_results_fetch: false,
          articles_preview_enabled: false,
          rweb_tipjar_consumption_enabled: false,
          creator_subscriptions_quote_tweet_preview_enabled: false
        },
        fieldToggles: {}
      }),
      method: "POST"
    }
  );
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response:", errorText);
    throw new Error(`Failed to create long tweet: ${errorText}`);
  }
  const data = await response.json();
  return data;
}
async function fetchListTweets(listId, maxTweets, cursor, auth) {
  if (maxTweets > 200) {
    maxTweets = 200;
  }
  const listTweetsRequest = apiRequestFactory.createListTweetsRequest();
  listTweetsRequest.variables.listId = listId;
  listTweetsRequest.variables.count = maxTweets;
  if (cursor != null && cursor != "") {
    listTweetsRequest.variables["cursor"] = cursor;
  }
  const res = await requestApi(
    listTweetsRequest.toRequestUrl(),
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  return parseListTimelineTweets(res.value);
}
function getTweets(user, maxTweets, auth) {
  return getTweetTimeline(user, maxTweets, async (q, mt, c) => {
    const userIdRes = await getUserIdByScreenName(q, auth);
    if (!userIdRes.success) {
      throw userIdRes.err;
    }
    const { value: userId } = userIdRes;
    return fetchTweets(userId, mt, c, auth);
  });
}
function getTweetsByUserId(userId, maxTweets, auth) {
  return getTweetTimeline(userId, maxTweets, (q, mt, c) => {
    return fetchTweets(q, mt, c, auth);
  });
}
function getTweetsAndReplies(user, maxTweets, auth) {
  return getTweetTimeline(user, maxTweets, async (q, mt, c) => {
    const userIdRes = await getUserIdByScreenName(q, auth);
    if (!userIdRes.success) {
      throw userIdRes.err;
    }
    const { value: userId } = userIdRes;
    return fetchTweetsAndReplies(userId, mt, c, auth);
  });
}
function getTweetsAndRepliesByUserId(userId, maxTweets, auth) {
  return getTweetTimeline(userId, maxTweets, (q, mt, c) => {
    return fetchTweetsAndReplies(q, mt, c, auth);
  });
}
async function getTweetWhere(tweets, query) {
  const isCallback = typeof query === "function";
  for await (const tweet of tweets) {
    const matches = isCallback ? await query(tweet) : checkTweetMatches(tweet, query);
    if (matches) {
      return tweet;
    }
  }
  return null;
}
async function getTweetsWhere(tweets, query) {
  const isCallback = typeof query === "function";
  const filtered = [];
  for await (const tweet of tweets) {
    const matches = isCallback ? query(tweet) : checkTweetMatches(tweet, query);
    if (!matches) continue;
    filtered.push(tweet);
  }
  return filtered;
}
function checkTweetMatches(tweet, options) {
  return Object.keys(options).every((k) => {
    const key = k;
    return tweet[key] === options[key];
  });
}
async function getLatestTweet(user, includeRetweets, max, auth) {
  const timeline = getTweets(user, max, auth);
  return max === 1 ? (await timeline.next()).value : await getTweetWhere(timeline, { isRetweet: includeRetweets });
}
async function getTweet(id, auth) {
  const tweetDetailRequest = apiRequestFactory.createTweetDetailRequest();
  tweetDetailRequest.variables.focalTweetId = id;
  const res = await requestApi(
    tweetDetailRequest.toRequestUrl(),
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  if (!res.value) {
    return null;
  }
  const tweets = parseThreadedConversation(res.value);
  return tweets.find((tweet) => tweet.id === id) ?? null;
}
async function getTweetV2(id, auth, options = defaultOptions) {
  const v2client = auth.getV2Client();
  if (!v2client) {
    throw new Error("V2 client is not initialized");
  }
  try {
    const tweetData = await v2client.v2.singleTweet(id, {
      expansions: options?.expansions,
      "tweet.fields": options?.tweetFields,
      "poll.fields": options?.pollFields,
      "media.fields": options?.mediaFields,
      "user.fields": options?.userFields,
      "place.fields": options?.placeFields
    });
    if (!tweetData?.data) {
      console.warn(`Tweet data not found for ID: ${id}`);
      return null;
    }
    const defaultTweetData = await getTweet(tweetData.data.id, auth);
    const parsedTweet = parseTweetV2ToV1(
      tweetData.data,
      tweetData?.includes,
      defaultTweetData
    );
    return parsedTweet;
  } catch (error) {
    console.error(`Error fetching tweet ${id}:`, error);
    return null;
  }
}
async function getTweetsV2(ids, auth, options = defaultOptions) {
  const v2client = auth.getV2Client();
  if (!v2client) {
    return [];
  }
  try {
    const tweetData = await v2client.v2.tweets(ids, {
      expansions: options?.expansions,
      "tweet.fields": options?.tweetFields,
      "poll.fields": options?.pollFields,
      "media.fields": options?.mediaFields,
      "user.fields": options?.userFields,
      "place.fields": options?.placeFields
    });
    const tweetsV2 = tweetData.data;
    if (tweetsV2.length === 0) {
      console.warn(`No tweet data found for IDs: ${ids.join(", ")}`);
      return [];
    }
    return (await Promise.all(
      tweetsV2.map(
        async (tweet) => await getTweetV2(tweet.id, auth, options)
      )
    )).filter((tweet) => tweet !== null);
  } catch (error) {
    console.error(`Error fetching tweets for IDs: ${ids.join(", ")}`, error);
    return [];
  }
}
async function getTweetAnonymous(id, auth) {
  const tweetResultByRestIdRequest = apiRequestFactory.createTweetResultByRestIdRequest();
  tweetResultByRestIdRequest.variables.tweetId = id;
  const res = await requestApi(
    tweetResultByRestIdRequest.toRequestUrl(),
    auth
  );
  if (!res.success) {
    throw res.err;
  }
  if (!res.value.data) {
    return null;
  }
  return parseTimelineEntryItemContentRaw(res.value.data, id);
}
async function uploadMedia(mediaData, auth, mediaType) {
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const cookies = await auth.cookieJar().getCookies(uploadUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(uploadUrl),
    "x-csrf-token": xCsrfToken?.value
  });
  const isVideo = mediaType.startsWith("video/");
  if (isVideo) {
    const mediaId = await uploadVideoInChunks(mediaData, mediaType);
    return mediaId;
  } else {
    const form = new FormData();
    form.append("media", new Blob([mediaData]));
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: form
    });
    await updateCookieJar(auth.cookieJar(), response.headers);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    return data.media_id_string;
  }
  async function uploadVideoInChunks(mediaData2, mediaType2) {
    const initParams = new URLSearchParams();
    initParams.append("command", "INIT");
    initParams.append("media_type", mediaType2);
    initParams.append("total_bytes", mediaData2.length.toString());
    const initResponse = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: initParams
    });
    if (!initResponse.ok) {
      throw new Error(await initResponse.text());
    }
    const initData = await initResponse.json();
    const mediaId = initData.media_id_string;
    const segmentSize = 5 * 1024 * 1024;
    let segmentIndex = 0;
    for (let offset = 0; offset < mediaData2.length; offset += segmentSize) {
      const chunk = mediaData2.slice(offset, offset + segmentSize);
      const appendForm = new FormData();
      appendForm.append("command", "APPEND");
      appendForm.append("media_id", mediaId);
      appendForm.append("segment_index", segmentIndex.toString());
      appendForm.append("media", new Blob([chunk]));
      const appendResponse = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: appendForm
      });
      if (!appendResponse.ok) {
        throw new Error(await appendResponse.text());
      }
      segmentIndex++;
    }
    const finalizeParams = new URLSearchParams();
    finalizeParams.append("command", "FINALIZE");
    finalizeParams.append("media_id", mediaId);
    const finalizeResponse = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: finalizeParams
    });
    if (!finalizeResponse.ok) {
      throw new Error(await finalizeResponse.text());
    }
    const finalizeData = await finalizeResponse.json();
    if (finalizeData.processing_info) {
      await checkUploadStatus(mediaId);
    }
    return mediaId;
  }
  async function checkUploadStatus(mediaId) {
    let processing = true;
    while (processing) {
      await new Promise((resolve) => setTimeout(resolve, 5e3));
      const statusParams = new URLSearchParams();
      statusParams.append("command", "STATUS");
      statusParams.append("media_id", mediaId);
      const statusResponse = await fetch(
        `${uploadUrl}?${statusParams.toString()}`,
        {
          method: "GET",
          headers
        }
      );
      if (!statusResponse.ok) {
        throw new Error(await statusResponse.text());
      }
      const statusData = await statusResponse.json();
      const state = statusData.processing_info.state;
      if (state === "succeeded") {
        processing = false;
      } else if (state === "failed") {
        throw new Error("Video processing failed");
      }
    }
  }
}
async function createQuoteTweetRequest(text, quotedTweetId, auth, mediaData) {
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const variables = {
    tweet_text: text,
    dark_request: false,
    attachment_url: `https://twitter.com/twitter/status/${quotedTweetId}`,
    media: {
      media_entities: [],
      possibly_sensitive: false
    },
    semantic_annotation_ids: []
  };
  if (mediaData && mediaData.length > 0) {
    const mediaIds = await Promise.all(
      mediaData.map(
        ({ data, mediaType }) => uploadMedia(data, auth, mediaType)
      )
    );
    variables.media.media_entities = mediaIds.map((id) => ({
      media_id: id,
      tagged_users: []
    }));
  }
  const response = await fetch(
    "https://twitter.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet",
    {
      headers,
      body: JSON.stringify({
        variables,
        features: {
          interactive_text_enabled: true,
          longform_notetweets_inline_media_enabled: false,
          responsive_web_text_conversations_enabled: false,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
          vibe_api_enabled: false,
          rweb_lists_timeline_redesign_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          creator_subscriptions_tweet_preview_api_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          longform_notetweets_rich_text_read_enabled: true,
          responsive_web_enhance_cards_enabled: false,
          subscriptions_verification_info_enabled: true,
          subscriptions_verification_info_reason_enabled: true,
          subscriptions_verification_info_verified_since_enabled: true,
          super_follow_badge_privacy_enabled: false,
          super_follow_exclusive_tweet_notifications_enabled: false,
          super_follow_tweet_api_enabled: false,
          super_follow_user_api_enabled: false,
          android_graphql_skip_api_media_color_palette: false,
          creator_subscriptions_subscription_count_enabled: false,
          blue_business_profile_image_shape_enabled: false,
          unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false,
          rweb_video_timestamps_enabled: true,
          c9s_tweet_anatomy_moderator_badge_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: false
        },
        fieldToggles: {}
      }),
      method: "POST"
    }
  );
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}
async function likeTweet(tweetId, auth) {
  const likeTweetUrl = "https://twitter.com/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet";
  const cookies = await auth.cookieJar().getCookies(likeTweetUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(likeTweetUrl),
    "content-type": "application/json",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const payload = {
    variables: {
      tweet_id: tweetId
    }
  };
  const response = await fetch(likeTweetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
}
async function retweet(tweetId, auth) {
  const retweetUrl = "https://twitter.com/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet";
  const cookies = await auth.cookieJar().getCookies(retweetUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(retweetUrl),
    "content-type": "application/json",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const payload = {
    variables: {
      tweet_id: tweetId,
      dark_request: false
    }
  };
  const response = await fetch(retweetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
}
async function createCreateLongTweetRequest(text, auth, tweetId, mediaData) {
  const url = "https://x.com/i/api/graphql/YNXM2DGuE2Sff6a2JD3Ztw/CreateNoteTweet";
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "x-csrf-token": xCsrfToken?.value
  });
  const variables = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: [],
      possibly_sensitive: false
    },
    semantic_annotation_ids: []
  };
  if (mediaData && mediaData.length > 0) {
    const mediaIds = await Promise.all(
      mediaData.map(
        ({ data, mediaType }) => uploadMedia(data, auth, mediaType)
      )
    );
    variables.media.media_entities = mediaIds.map((id) => ({
      media_id: id,
      tagged_users: []
    }));
  }
  if (tweetId) {
    variables.reply = { in_reply_to_tweet_id: tweetId };
  }
  const features2 = {
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    profile_label_improvements_pcf_label_in_post_enabled: false,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    articles_preview_enabled: true,
    rweb_video_timestamps_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };
  const response = await fetch(url, {
    headers,
    body: JSON.stringify({
      variables,
      features: features2,
      queryId: "YNXM2DGuE2Sff6a2JD3Ztw"
    }),
    method: "POST"
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response;
}

async function fetchHomeTimeline(count, seenTweetIds, auth) {
  const variables = {
    count,
    includePromotedContent: true,
    latestControlAvailable: true,
    requestContext: "launch",
    withCommunity: true,
    seenTweetIds
  };
  const features = {
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };
  const res = await requestApi(
    `https://x.com/i/api/graphql/HJFjzBgCs16TqxewQOeLNg/HomeTimeline?variables=${encodeURIComponent(
      JSON.stringify(variables)
    )}&features=${encodeURIComponent(JSON.stringify(features))}`,
    auth,
    "GET"
  );
  if (!res.success) {
    if (res.err instanceof ApiError) {
      console.error("Error details:", res.err.data);
    }
    throw res.err;
  }
  const home = res.value?.data?.home.home_timeline_urt?.instructions;
  if (!home) {
    return [];
  }
  const entries = [];
  for (const instruction of home) {
    if (instruction.type === "TimelineAddEntries") {
      for (const entry of instruction.entries ?? []) {
        entries.push(entry);
      }
    }
  }
  const tweets = entries.map((entry) => entry.content.itemContent?.tweet_results?.result).filter((tweet) => tweet !== void 0);
  return tweets;
}

async function fetchFollowingTimeline(count, seenTweetIds, auth) {
  const variables = {
    count,
    includePromotedContent: true,
    latestControlAvailable: true,
    requestContext: "launch",
    seenTweetIds
  };
  const features = {
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };
  const res = await requestApi(
    `https://x.com/i/api/graphql/K0X1xbCZUjttdK8RazKAlw/HomeLatestTimeline?variables=${encodeURIComponent(
      JSON.stringify(variables)
    )}&features=${encodeURIComponent(JSON.stringify(features))}`,
    auth,
    "GET"
  );
  if (!res.success) {
    if (res.err instanceof ApiError) {
      console.error("Error details:", res.err.data);
    }
    throw res.err;
  }
  const home = res.value?.data?.home.home_timeline_urt?.instructions;
  if (!home) {
    return [];
  }
  const entries = [];
  for (const instruction of home) {
    if (instruction.type === "TimelineAddEntries") {
      for (const entry of instruction.entries ?? []) {
        entries.push(entry);
      }
    }
  }
  const tweets = entries.map((entry) => entry.content.itemContent?.tweet_results?.result).filter((tweet) => tweet !== void 0);
  return tweets;
}

function parseDirectMessageConversations(data, userId) {
  try {
    const inboxState = data?.inbox_initial_state;
    const conversations = inboxState?.conversations || {};
    const entries = inboxState?.entries || [];
    const users = inboxState?.users || {};
    const parsedUsers = Object.values(users).map(
      (user) => ({
        id: user.id_str,
        screenName: user.screen_name,
        name: user.name,
        profileImageUrl: user.profile_image_url_https,
        description: user.description,
        verified: user.verified,
        protected: user.protected,
        followersCount: user.followers_count,
        friendsCount: user.friends_count
      })
    );
    const messagesByConversation = {};
    entries.forEach((entry) => {
      if (entry.message) {
        const convId = entry.message.conversation_id;
        if (!messagesByConversation[convId]) {
          messagesByConversation[convId] = [];
        }
        messagesByConversation[convId].push(entry.message);
      }
    });
    const parsedConversations = Object.entries(conversations).map(
      ([convId, conv]) => {
        const messages = messagesByConversation[convId] || [];
        messages.sort((a, b) => Number(a.time) - Number(b.time));
        return {
          conversationId: convId,
          messages: parseDirectMessages(messages, users),
          participants: conv.participants.map((p) => ({
            id: p.user_id,
            screenName: users[p.user_id]?.screen_name || p.user_id
          }))
        };
      }
    );
    return {
      conversations: parsedConversations,
      users: parsedUsers,
      cursor: inboxState?.cursor,
      lastSeenEventId: inboxState?.last_seen_event_id,
      trustedLastSeenEventId: inboxState?.trusted_last_seen_event_id,
      untrustedLastSeenEventId: inboxState?.untrusted_last_seen_event_id,
      inboxTimelines: {
        trusted: inboxState?.inbox_timelines?.trusted && {
          status: inboxState.inbox_timelines.trusted.status,
          minEntryId: inboxState.inbox_timelines.trusted.min_entry_id
        },
        untrusted: inboxState?.inbox_timelines?.untrusted && {
          status: inboxState.inbox_timelines.untrusted.status,
          minEntryId: inboxState.inbox_timelines.untrusted.min_entry_id
        }
      },
      userId
    };
  } catch (error) {
    console.error("Error parsing DM conversations:", error);
    return {
      conversations: [],
      users: [],
      userId
    };
  }
}
function parseDirectMessages(messages, users) {
  try {
    return messages.map((msg) => ({
      id: msg.message_data.id,
      text: msg.message_data.text,
      senderId: msg.message_data.sender_id,
      recipientId: msg.message_data.recipient_id,
      createdAt: msg.message_data.time,
      mediaUrls: extractMediaUrls(msg.message_data),
      senderScreenName: users[msg.message_data.sender_id]?.screen_name,
      recipientScreenName: users[msg.message_data.recipient_id]?.screen_name
    }));
  } catch (error) {
    console.error("Error parsing DMs:", error);
    return [];
  }
}
function extractMediaUrls(messageData) {
  const urls = [];
  if (messageData.entities?.urls) {
    messageData.entities.urls.forEach((url) => {
      urls.push(url.expanded_url);
    });
  }
  if (messageData.entities?.media) {
    messageData.entities.media.forEach((media) => {
      urls.push(media.media_url_https || media.media_url);
    });
  }
  return urls.length > 0 ? urls : void 0;
}
async function getDirectMessageConversations(userId, auth, cursor) {
  if (!auth.isLoggedIn()) {
    throw new Error("Authentication required to fetch direct messages");
  }
  const url = "https://twitter.com/i/api/graphql/7s3kOODhC5vgXlO0OlqYdA/DMInboxTimeline";
  const messageListUrl = "https://x.com/i/api/1.1/dm/inbox_initial_state.json";
  const params = new URLSearchParams();
  if (cursor) {
    params.append("cursor", cursor);
  }
  const finalUrl = `${messageListUrl}${params.toString() ? "?" + params.toString() : ""}`;
  const cookies = await auth.cookieJar().getCookies(url);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(url),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const response = await fetch(finalUrl, {
    method: "GET",
    headers
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data = await response.json();
  return parseDirectMessageConversations(data, userId);
}
async function sendDirectMessage(auth, conversation_id, text) {
  if (!auth.isLoggedIn()) {
    throw new Error("Authentication required to send direct messages");
  }
  const url = "https://twitter.com/i/api/graphql/7s3kOODhC5vgXlO0OlqYdA/DMInboxTimeline";
  const messageDmUrl = "https://x.com/i/api/1.1/dm/new2.json";
  const cookies = await auth.cookieJar().getCookies(url);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    authorization: `Bearer ${auth.bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(url),
    "content-type": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const payload = {
    conversation_id: `${conversation_id}`,
    recipient_ids: false,
    text,
    cards_platform: "Web-12",
    include_cards: 1,
    include_quote_count: true,
    dm_users: false
  };
  const response = await fetch(messageDmUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
}

function generateRandomId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
async function fetchAudioSpaceById(variables, auth) {
  const queryId = "Tvv_cNXCbtTcgdy1vWYPMw";
  const operationName = "AudioSpaceById";
  const variablesEncoded = encodeURIComponent(JSON.stringify(variables));
  const features = {
    spaces_2022_h2_spaces_communities: true,
    spaces_2022_h2_clipping: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    profile_label_improvements_pcf_label_in_post_enabled: false,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: true,
    articles_preview_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };
  const featuresEncoded = encodeURIComponent(JSON.stringify(features));
  const url = `https://x.com/i/api/graphql/${queryId}/${operationName}?variables=${variablesEncoded}&features=${featuresEncoded}`;
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${auth.bearerToken}`,
    "Content-Type": "application/json",
    Cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const response = await auth.fetch(url, {
    headers,
    method: "GET"
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(`Failed to fetch Audio Space: ${await response.text()}`);
  }
  const data = await response.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(`API Errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data.audioSpace;
}
async function fetchBrowseSpaceTopics(auth) {
  const queryId = "TYpVV9QioZfViHqEqRZxJA";
  const operationName = "BrowseSpaceTopics";
  const variables = {};
  const features = {};
  const variablesEncoded = encodeURIComponent(JSON.stringify(variables));
  const featuresEncoded = encodeURIComponent(JSON.stringify(features));
  const url = `https://x.com/i/api/graphql/${queryId}/${operationName}?variables=${variablesEncoded}&features=${featuresEncoded}`;
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${auth.bearerToken}`,
    "Content-Type": "application/json",
    Cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const response = await auth.fetch(url, {
    headers,
    method: "GET"
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(`Failed to fetch Space Topics: ${await response.text()}`);
  }
  const data = await response.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(`API Errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data.browse_space_topics.categories.flatMap(
    (category) => category.subtopics
  );
}
async function fetchCommunitySelectQuery(auth) {
  const queryId = "Lue1DfmoW2cc0225t_8z1w";
  const operationName = "CommunitySelectQuery";
  const variables = {};
  const features = {};
  const variablesEncoded = encodeURIComponent(JSON.stringify(variables));
  const featuresEncoded = encodeURIComponent(JSON.stringify(features));
  const url = `https://x.com/i/api/graphql/${queryId}/${operationName}?variables=${variablesEncoded}&features=${featuresEncoded}`;
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${auth.bearerToken}`,
    "Content-Type": "application/json",
    Cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  const response = await auth.fetch(url, {
    headers,
    method: "GET"
  });
  await updateCookieJar(auth.cookieJar(), response.headers);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Community Select Query: ${await response.text()}`
    );
  }
  const data = await response.json();
  if (data.errors && data.errors.length > 0) {
    throw new Error(`API Errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data.space_hostable_communities;
}
async function fetchLiveVideoStreamStatus(mediaKey, auth) {
  const baseUrl = `https://x.com/i/api/1.1/live_video_stream/status/${mediaKey}`;
  const queryParams = new URLSearchParams({
    client: "web",
    use_syndication_guest_id: "false",
    cookie_set_host: "x.com"
  });
  const url = `${baseUrl}?${queryParams.toString()}`;
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${auth.bearerToken}`,
    "Content-Type": "application/json",
    Cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Client",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken?.value
  });
  try {
    const response = await auth.fetch(url, {
      method: "GET",
      headers
    });
    await updateCookieJar(auth.cookieJar(), response.headers);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch live video stream status: ${await response.text()}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(
      `Error fetching live video stream status for mediaKey ${mediaKey}:`,
      error
    );
    throw error;
  }
}
async function fetchAuthenticatePeriscope(auth) {
  const queryId = "r7VUmxbfqNkx7uwjgONSNw";
  const operationName = "AuthenticatePeriscope";
  const variables = {};
  const features = {};
  const variablesEncoded = encodeURIComponent(JSON.stringify(variables));
  const featuresEncoded = encodeURIComponent(JSON.stringify(features));
  const url = `https://x.com/i/api/graphql/${queryId}/${operationName}?variables=${variablesEncoded}&features=${featuresEncoded}`;
  const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
  if (!xCsrfToken) {
    throw new Error("CSRF Token (ct0) not found in cookies.");
  }
  const clientTransactionId = generateRandomId();
  const headers = new Headers({
    Accept: "*/*",
    Authorization: `Bearer ${auth.bearerToken}`,
    "Content-Type": "application/json",
    Cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "x-guest-token": auth.guestToken,
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-active-user": "yes",
    "x-csrf-token": xCsrfToken.value,
    "x-client-transaction-id": clientTransactionId,
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "x-twitter-client-language": "en",
    "sec-ch-ua-mobile": "?0",
    Referer: "https://x.com/i/spaces/start"
  });
  try {
    const response = await auth.fetch(url, {
      method: "GET",
      headers
    });
    await updateCookieJar(auth.cookieJar(), response.headers);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(`API Errors: ${JSON.stringify(data.errors)}`);
    }
    if (!data.data.authenticate_periscope) {
      throw new Error("Periscope authentication failed, no data returned.");
    }
    return data.data.authenticate_periscope;
  } catch (error) {
    console.error("Error during Periscope authentication:", error);
    throw error;
  }
}
async function fetchLoginTwitterToken(jwt, auth) {
  const url = "https://proxsee.pscp.tv/api/v2/loginTwitterToken";
  const idempotenceKey = generateRandomId();
  const payload = {
    jwt,
    vendor_id: "m5-proxsee-login-a2011357b73e",
    create_user: true
  };
  const headers = new Headers({
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: "https://x.com/",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-platform": '"Windows"',
    "sec-ch-ua-mobile": "?0",
    "X-Periscope-User-Agent": "Twitter/m5",
    "X-Idempotence": idempotenceKey,
    "X-Attempt": "1"
  });
  try {
    const response = await auth.fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    await updateCookieJar(auth.cookieJar(), response.headers);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    if (!data.cookie || !data.user) {
      throw new Error("Twitter authentication failed, missing data.");
    }
    return data;
  } catch (error) {
    console.error("Error logging into Twitter via Proxsee:", error);
    throw error;
  }
}

const twUrl = "https://twitter.com";
const UserTweetsUrl = "https://twitter.com/i/api/graphql/E3opETHurmVJflFsUBVuUQ/UserTweets";
class Scraper {
  /**
   * Creates a new Scraper object.
   * - Scrapers maintain their own guest tokens for Twitter's internal API.
   * - Reusing Scraper objects is recommended to minimize the time spent authenticating unnecessarily.
   */
  constructor(options) {
    this.options = options;
    this.token = bearerToken;
    this.useGuestAuth();
  }
  /**
   * Initializes auth properties using a guest token.
   * Used when creating a new instance of this class, and when logging out.
   * @internal
   */
  useGuestAuth() {
    this.auth = new TwitterGuestAuth(this.token, this.getAuthOptions());
    this.authTrends = new TwitterGuestAuth(this.token, this.getAuthOptions());
  }
  /**
   * Fetches a Twitter profile.
   * @param username The Twitter username of the profile to fetch, without an `@` at the beginning.
   * @returns The requested {@link Profile}.
   */
  async getProfile(username) {
    const res = await getProfile(username, this.auth);
    return this.handleResponse(res);
  }
  /**
   * Fetches the user ID corresponding to the provided screen name.
   * @param screenName The Twitter screen name of the profile to fetch.
   * @returns The ID of the corresponding account.
   */
  async getUserIdByScreenName(screenName) {
    const res = await getUserIdByScreenName(screenName, this.auth);
    return this.handleResponse(res);
  }
  /**
   *
   * @param userId The user ID of the profile to fetch.
   * @returns The screen name of the corresponding account.
   */
  async getScreenNameByUserId(userId) {
    const response = await getScreenNameByUserId(userId, this.auth);
    return this.handleResponse(response);
  }
  /**
   * Fetches tweets from Twitter.
   * @param query The search query. Any Twitter-compatible query format can be used.
   * @param maxTweets The maximum number of tweets to return.
   * @param includeReplies Whether or not replies should be included in the response.
   * @param searchMode The category filter to apply to the search. Defaults to `Top`.
   * @returns An {@link AsyncGenerator} of tweets matching the provided filters.
   */
  searchTweets(query, maxTweets, searchMode = SearchMode.Top) {
    return searchTweets(query, maxTweets, searchMode, this.auth);
  }
  /**
   * Fetches profiles from Twitter.
   * @param query The search query. Any Twitter-compatible query format can be used.
   * @param maxProfiles The maximum number of profiles to return.
   * @returns An {@link AsyncGenerator} of tweets matching the provided filter(s).
   */
  searchProfiles(query, maxProfiles) {
    return searchProfiles(query, maxProfiles, this.auth);
  }
  /**
   * Fetches tweets from Twitter.
   * @param query The search query. Any Twitter-compatible query format can be used.
   * @param maxTweets The maximum number of tweets to return.
   * @param includeReplies Whether or not replies should be included in the response.
   * @param searchMode The category filter to apply to the search. Defaults to `Top`.
   * @param cursor The search cursor, which can be passed into further requests for more results.
   * @returns A page of results, containing a cursor that can be used in further requests.
   */
  fetchSearchTweets(query, maxTweets, searchMode, cursor) {
    return fetchSearchTweets(query, maxTweets, searchMode, this.auth, cursor);
  }
  /**
   * Fetches profiles from Twitter.
   * @param query The search query. Any Twitter-compatible query format can be used.
   * @param maxProfiles The maximum number of profiles to return.
   * @param cursor The search cursor, which can be passed into further requests for more results.
   * @returns A page of results, containing a cursor that can be used in further requests.
   */
  fetchSearchProfiles(query, maxProfiles, cursor) {
    return fetchSearchProfiles(query, maxProfiles, this.auth, cursor);
  }
  /**
   * Fetches list tweets from Twitter.
   * @param listId The list id
   * @param maxTweets The maximum number of tweets to return.
   * @param cursor The search cursor, which can be passed into further requests for more results.
   * @returns A page of results, containing a cursor that can be used in further requests.
   */
  fetchListTweets(listId, maxTweets, cursor) {
    return fetchListTweets(listId, maxTweets, cursor, this.auth);
  }
  /**
   * Fetch the profiles a user is following
   * @param userId The user whose following should be returned
   * @param maxProfiles The maximum number of profiles to return.
   * @returns An {@link AsyncGenerator} of following profiles for the provided user.
   */
  getFollowing(userId, maxProfiles) {
    return getFollowing(userId, maxProfiles, this.auth);
  }
  /**
   * Fetch the profiles that follow a user
   * @param userId The user whose followers should be returned
   * @param maxProfiles The maximum number of profiles to return.
   * @returns An {@link AsyncGenerator} of profiles following the provided user.
   */
  getFollowers(userId, maxProfiles) {
    return getFollowers(userId, maxProfiles, this.auth);
  }
  /**
   * Fetches following profiles from Twitter.
   * @param userId The user whose following should be returned
   * @param maxProfiles The maximum number of profiles to return.
   * @param cursor The search cursor, which can be passed into further requests for more results.
   * @returns A page of results, containing a cursor that can be used in further requests.
   */
  fetchProfileFollowing(userId, maxProfiles, cursor) {
    return fetchProfileFollowing(userId, maxProfiles, this.auth, cursor);
  }
  /**
   * Fetches profile followers from Twitter.
   * @param userId The user whose following should be returned
   * @param maxProfiles The maximum number of profiles to return.
   * @param cursor The search cursor, which can be passed into further requests for more results.
   * @returns A page of results, containing a cursor that can be used in further requests.
   */
  fetchProfileFollowers(userId, maxProfiles, cursor) {
    return fetchProfileFollowers(userId, maxProfiles, this.auth, cursor);
  }
  /**
   * Fetches the home timeline for the current user. (for you feed)
   * @param count The number of tweets to fetch.
   * @param seenTweetIds An array of tweet IDs that have already been seen.
   * @returns A promise that resolves to the home timeline response.
   */
  async fetchHomeTimeline(count, seenTweetIds) {
    return await fetchHomeTimeline(count, seenTweetIds, this.auth);
  }
  /**
   * Fetches the home timeline for the current user. (following feed)
   * @param count The number of tweets to fetch.
   * @param seenTweetIds An array of tweet IDs that have already been seen.
   * @returns A promise that resolves to the home timeline response.
   */
  async fetchFollowingTimeline(count, seenTweetIds) {
    return await fetchFollowingTimeline(count, seenTweetIds, this.auth);
  }
  async getUserTweets(userId, maxTweets = 200, cursor) {
    if (maxTweets > 200) {
      maxTweets = 200;
    }
    const variables = {
      userId,
      count: maxTweets,
      includePromotedContent: true,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true
    };
    if (cursor) {
      variables["cursor"] = cursor;
    }
    const features = {
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      rweb_video_timestamps_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_enhance_cards_enabled: false
    };
    const fieldToggles = {
      withArticlePlainText: false
    };
    const res = await requestApi(
      `${UserTweetsUrl}?variables=${encodeURIComponent(
        JSON.stringify(variables)
      )}&features=${encodeURIComponent(
        JSON.stringify(features)
      )}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`,
      this.auth
    );
    if (!res.success) {
      throw res.err;
    }
    const timelineV2 = parseTimelineTweetsV2(res.value);
    return {
      tweets: timelineV2.tweets,
      next: timelineV2.next
    };
  }
  async *getUserTweetsIterator(userId, maxTweets = 200) {
    let cursor;
    let retrievedTweets = 0;
    while (retrievedTweets < maxTweets) {
      const response = await this.getUserTweets(
        userId,
        maxTweets - retrievedTweets,
        cursor
      );
      for (const tweet of response.tweets) {
        yield tweet;
        retrievedTweets++;
        if (retrievedTweets >= maxTweets) {
          break;
        }
      }
      cursor = response.next;
      if (!cursor) {
        break;
      }
    }
  }
  /**
   * Fetches the current trends from Twitter.
   * @returns The current list of trends.
   */
  getTrends() {
    return getTrends(this.authTrends);
  }
  /**
   * Fetches tweets from a Twitter user.
   * @param user The user whose tweets should be returned.
   * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
   * @returns An {@link AsyncGenerator} of tweets from the provided user.
   */
  getTweets(user, maxTweets = 200) {
    return getTweets(user, maxTweets, this.auth);
  }
  /**
   * Fetches tweets from a Twitter user using their ID.
   * @param userId The user whose tweets should be returned.
   * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
   * @returns An {@link AsyncGenerator} of tweets from the provided user.
   */
  getTweetsByUserId(userId, maxTweets = 200) {
    return getTweetsByUserId(userId, maxTweets, this.auth);
  }
  /**
   * Send a tweet
   * @param text The text of the tweet
   * @param tweetId The id of the tweet to reply to
   * @param mediaData Optional media data
   * @returns
   */
  async sendTweet(text, replyToTweetId, mediaData) {
    return await createCreateTweetRequest(
      text,
      this.auth,
      replyToTweetId,
      mediaData
    );
  }
  async sendNoteTweet(text, replyToTweetId, mediaData) {
    return await createCreateNoteTweetRequest(
      text,
      this.auth,
      replyToTweetId,
      mediaData
    );
  }
  /**
   * Send a long tweet (Note Tweet)
   * @param text The text of the tweet
   * @param tweetId The id of the tweet to reply to
   * @param mediaData Optional media data
   * @returns
   */
  async sendLongTweet(text, replyToTweetId, mediaData) {
    return await createCreateLongTweetRequest(
      text,
      this.auth,
      replyToTweetId,
      mediaData
    );
  }
  /**
   * Send a tweet
   * @param text The text of the tweet
   * @param tweetId The id of the tweet to reply to
   * @param options The options for the tweet
   * @returns
   */
  async sendTweetV2(text, replyToTweetId, options) {
    return await createCreateTweetRequestV2(
      text,
      this.auth,
      replyToTweetId,
      options
    );
  }
  /**
   * Fetches tweets and replies from a Twitter user.
   * @param user The user whose tweets should be returned.
   * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
   * @returns An {@link AsyncGenerator} of tweets from the provided user.
   */
  getTweetsAndReplies(user, maxTweets = 200) {
    return getTweetsAndReplies(user, maxTweets, this.auth);
  }
  /**
   * Fetches tweets and replies from a Twitter user using their ID.
   * @param userId The user whose tweets should be returned.
   * @param maxTweets The maximum number of tweets to return. Defaults to `200`.
   * @returns An {@link AsyncGenerator} of tweets from the provided user.
   */
  getTweetsAndRepliesByUserId(userId, maxTweets = 200) {
    return getTweetsAndRepliesByUserId(userId, maxTweets, this.auth);
  }
  /**
   * Fetches the first tweet matching the given query.
   *
   * Example:
   * ```js
   * const timeline = scraper.getTweets('user', 200);
   * const retweet = await scraper.getTweetWhere(timeline, { isRetweet: true });
   * ```
   * @param tweets The {@link AsyncIterable} of tweets to search through.
   * @param query A query to test **all** tweets against. This may be either an
   * object of key/value pairs or a predicate. If this query is an object, all
   * key/value pairs must match a {@link Tweet} for it to be returned. If this query
   * is a predicate, it must resolve to `true` for a {@link Tweet} to be returned.
   * - All keys are optional.
   * - If specified, the key must be implemented by that of {@link Tweet}.
   */
  getTweetWhere(tweets, query) {
    return getTweetWhere(tweets, query);
  }
  /**
   * Fetches all tweets matching the given query.
   *
   * Example:
   * ```js
   * const timeline = scraper.getTweets('user', 200);
   * const retweets = await scraper.getTweetsWhere(timeline, { isRetweet: true });
   * ```
   * @param tweets The {@link AsyncIterable} of tweets to search through.
   * @param query A query to test **all** tweets against. This may be either an
   * object of key/value pairs or a predicate. If this query is an object, all
   * key/value pairs must match a {@link Tweet} for it to be returned. If this query
   * is a predicate, it must resolve to `true` for a {@link Tweet} to be returned.
   * - All keys are optional.
   * - If specified, the key must be implemented by that of {@link Tweet}.
   */
  getTweetsWhere(tweets, query) {
    return getTweetsWhere(tweets, query);
  }
  /**
   * Fetches the most recent tweet from a Twitter user.
   * @param user The user whose latest tweet should be returned.
   * @param includeRetweets Whether or not to include retweets. Defaults to `false`.
   * @returns The {@link Tweet} object or `null`/`undefined` if it couldn't be fetched.
   */
  getLatestTweet(user, includeRetweets = false, max = 200) {
    return getLatestTweet(user, includeRetweets, max, this.auth);
  }
  /**
   * Fetches a single tweet.
   * @param id The ID of the tweet to fetch.
   * @returns The {@link Tweet} object, or `null` if it couldn't be fetched.
   */
  getTweet(id) {
    if (this.auth instanceof TwitterUserAuth) {
      return getTweet(id, this.auth);
    } else {
      return getTweetAnonymous(id, this.auth);
    }
  }
  /**
   * Fetches a single tweet by ID using the Twitter API v2.
   * Allows specifying optional expansions and fields for more detailed data.
   *
   * @param {string} id - The ID of the tweet to fetch.
   * @param {Object} [options] - Optional parameters to customize the tweet data.
   * @param {string[]} [options.expansions] - Array of expansions to include, e.g., 'attachments.poll_ids'.
   * @param {string[]} [options.tweetFields] - Array of tweet fields to include, e.g., 'created_at', 'public_metrics'.
   * @param {string[]} [options.pollFields] - Array of poll fields to include, if the tweet has a poll, e.g., 'options', 'end_datetime'.
   * @param {string[]} [options.mediaFields] - Array of media fields to include, if the tweet includes media, e.g., 'url', 'preview_image_url'.
   * @param {string[]} [options.userFields] - Array of user fields to include, if user information is requested, e.g., 'username', 'verified'.
   * @param {string[]} [options.placeFields] - Array of place fields to include, if the tweet includes location data, e.g., 'full_name', 'country'.
   * @returns {Promise<TweetV2 | null>} - The tweet data, including requested expansions and fields.
   */
  async getTweetV2(id, options = defaultOptions) {
    return await getTweetV2(id, this.auth, options);
  }
  /**
   * Fetches multiple tweets by IDs using the Twitter API v2.
   * Allows specifying optional expansions and fields for more detailed data.
   *
   * @param {string[]} ids - Array of tweet IDs to fetch.
   * @param {Object} [options] - Optional parameters to customize the tweet data.
   * @param {string[]} [options.expansions] - Array of expansions to include, e.g., 'attachments.poll_ids'.
   * @param {string[]} [options.tweetFields] - Array of tweet fields to include, e.g., 'created_at', 'public_metrics'.
   * @param {string[]} [options.pollFields] - Array of poll fields to include, if tweets contain polls, e.g., 'options', 'end_datetime'.
   * @param {string[]} [options.mediaFields] - Array of media fields to include, if tweets contain media, e.g., 'url', 'preview_image_url'.
   * @param {string[]} [options.userFields] - Array of user fields to include, if user information is requested, e.g., 'username', 'verified'.
   * @param {string[]} [options.placeFields] - Array of place fields to include, if tweets contain location data, e.g., 'full_name', 'country'.
   * @returns {Promise<TweetV2[]> } - Array of tweet data, including requested expansions and fields.
   */
  async getTweetsV2(ids, options = defaultOptions) {
    return await getTweetsV2(ids, this.auth, options);
  }
  /**
   * Returns if the scraper has a guest token. The token may not be valid.
   * @returns `true` if the scraper has a guest token; otherwise `false`.
   */
  hasGuestToken() {
    return this.auth.hasToken() || this.authTrends.hasToken();
  }
  /**
   * Returns if the scraper is logged in as a real user.
   * @returns `true` if the scraper is logged in with a real user account; otherwise `false`.
   */
  async isLoggedIn() {
    return await this.auth.isLoggedIn() && await this.authTrends.isLoggedIn();
  }
  /**
   * Returns the currently logged in user
   * @returns The currently logged in user
   */
  async me() {
    return this.auth.me();
  }
  /**
   * Login to Twitter as a real Twitter account. This enables running
   * searches.
   * @param username The username of the Twitter account to login with.
   * @param password The password of the Twitter account to login with.
   * @param email The email to log in with, if you have email confirmation enabled.
   * @param twoFactorSecret The secret to generate two factor authentication tokens with, if you have two factor authentication enabled.
   */
  async login(username, password, email, twoFactorSecret, appKey, appSecret, accessToken, accessSecret) {
    const userAuth = new TwitterUserAuth(this.token, this.getAuthOptions());
    await userAuth.login(
      username,
      password,
      email,
      twoFactorSecret,
      appKey,
      appSecret,
      accessToken,
      accessSecret
    );
    this.auth = userAuth;
    this.authTrends = userAuth;
  }
  /**
   * Log out of Twitter.
   */
  async logout() {
    await this.auth.logout();
    await this.authTrends.logout();
    this.useGuestAuth();
  }
  /**
   * Retrieves all cookies for the current session.
   * @returns All cookies for the current session.
   */
  async getCookies() {
    return await this.authTrends.cookieJar().getCookies(
      typeof document !== "undefined" ? document.location.toString() : twUrl
    );
  }
  /**
   * Set cookies for the current session.
   * @param cookies The cookies to set for the current session.
   */
  async setCookies(cookies) {
    const userAuth = new TwitterUserAuth(this.token, this.getAuthOptions());
    for (const cookie of cookies) {
      await userAuth.cookieJar().setCookie(cookie, twUrl);
    }
    this.auth = userAuth;
    this.authTrends = userAuth;
  }
  /**
   * Clear all cookies for the current session.
   */
  async clearCookies() {
    await this.auth.cookieJar().removeAllCookies();
    await this.authTrends.cookieJar().removeAllCookies();
  }
  /**
   * Sets the optional cookie to be used in requests.
   * @param _cookie The cookie to be used in requests.
   * @deprecated This function no longer represents any part of Twitter's auth flow.
   * @returns This scraper instance.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withCookie(_cookie) {
    console.warn(
      "Warning: Scraper#withCookie is deprecated and will be removed in a later version. Use Scraper#login or Scraper#setCookies instead."
    );
    return this;
  }
  /**
   * Sets the optional CSRF token to be used in requests.
   * @param _token The CSRF token to be used in requests.
   * @deprecated This function no longer represents any part of Twitter's auth flow.
   * @returns This scraper instance.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  withXCsrfToken(_token) {
    console.warn(
      "Warning: Scraper#withXCsrfToken is deprecated and will be removed in a later version."
    );
    return this;
  }
  /**
   * Sends a quote tweet.
   * @param text The text of the tweet.
   * @param quotedTweetId The ID of the tweet to quote.
   * @param options Optional parameters, such as media data.
   * @returns The response from the Twitter API.
   */
  async sendQuoteTweet(text, quotedTweetId, options) {
    return await createQuoteTweetRequest(
      text,
      quotedTweetId,
      this.auth,
      options?.mediaData
    );
  }
  /**
   * Likes a tweet with the given tweet ID.
   * @param tweetId The ID of the tweet to like.
   * @returns A promise that resolves when the tweet is liked.
   */
  async likeTweet(tweetId) {
    await likeTweet(tweetId, this.auth);
  }
  /**
   * Retweets a tweet with the given tweet ID.
   * @param tweetId The ID of the tweet to retweet.
   * @returns A promise that resolves when the tweet is retweeted.
   */
  async retweet(tweetId) {
    await retweet(tweetId, this.auth);
  }
  /**
   * Follows a user with the given user ID.
   * @param userId The user ID of the user to follow.
   * @returns A promise that resolves when the user is followed.
   */
  async followUser(userName) {
    await followUser(userName, this.auth);
  }
  /**
   * Fetches direct message conversations
   * @param count Number of conversations to fetch (default: 50)
   * @param cursor Pagination cursor for fetching more conversations
   * @returns Array of DM conversations and other details
   */
  async getDirectMessageConversations(userId, cursor) {
    return await getDirectMessageConversations(userId, this.auth, cursor);
  }
  /**
   * Sends a direct message to a user.
   * @param conversationId The ID of the conversation to send the message to.
   * @param text The text of the message to send.
   * @returns The response from the Twitter API.
   */
  async sendDirectMessage(conversationId, text) {
    return await sendDirectMessage(this.auth, conversationId, text);
  }
  getAuthOptions() {
    return {
      fetch: this.options?.fetch,
      transform: this.options?.transform
    };
  }
  handleResponse(res) {
    if (!res.success) {
      throw res.err;
    }
    return res.value;
  }
  /**
   * Retrieves the details of an Audio Space by its ID.
   * @param id The ID of the Audio Space.
   * @returns The details of the Audio Space.
   */
  async getAudioSpaceById(id) {
    const variables = {
      id,
      isMetatagsQuery: false,
      withReplays: true,
      withListeners: true
    };
    return await fetchAudioSpaceById(variables, this.auth);
  }
  /**
   * Retrieves available space topics.
   * @returns An array of space topics.
   */
  async browseSpaceTopics() {
    return await fetchBrowseSpaceTopics(this.auth);
  }
  /**
   * Retrieves available communities.
   * @returns An array of communities.
   */
  async communitySelectQuery() {
    return await fetchCommunitySelectQuery(this.auth);
  }
  /**
   * Retrieves the status of an Audio Space stream by its media key.
   * @param mediaKey The media key of the Audio Space.
   * @returns The status of the Audio Space stream.
   */
  async getAudioSpaceStreamStatus(mediaKey) {
    return await fetchLiveVideoStreamStatus(mediaKey, this.auth);
  }
  /**
   * Retrieves the status of an Audio Space by its ID.
   * This method internally fetches the Audio Space to obtain the media key,
   * then retrieves the stream status using the media key.
   * @param audioSpaceId The ID of the Audio Space.
   * @returns The status of the Audio Space stream.
   */
  async getAudioSpaceStatus(audioSpaceId) {
    const audioSpace = await this.getAudioSpaceById(audioSpaceId);
    const mediaKey = audioSpace.metadata.media_key;
    if (!mediaKey) {
      throw new Error("Media Key not found in Audio Space metadata.");
    }
    return await this.getAudioSpaceStreamStatus(mediaKey);
  }
  /**
   * Authenticates Periscope to obtain a token.
   * @returns The Periscope authentication token.
   */
  async authenticatePeriscope() {
    return await fetchAuthenticatePeriscope(this.auth);
  }
  /**
   * Logs in to Twitter via Proxsee using the Periscope JWT.
   * @param jwt The JWT obtained from AuthenticatePeriscope.
   * @returns The response containing the cookie and user information.
   */
  async loginTwitterToken(jwt) {
    return await fetchLoginTwitterToken(jwt, this.auth);
  }
  /**
   * Orchestrates the flow: get token -> login -> return Periscope cookie
   */
  async getPeriscopeCookie() {
    const periscopeToken = await this.authenticatePeriscope();
    const loginResponse = await this.loginTwitterToken(periscopeToken);
    return loginResponse.cookie;
  }
}

class ChatClient extends EventEmitter {
  constructor(spaceId, accessToken, endpoint) {
    super();
    this.spaceId = spaceId;
    this.accessToken = accessToken;
    this.endpoint = endpoint;
    this.connected = false;
  }
  async connect() {
    const wsUrl = `${this.endpoint}/chatapi/v1/chatnow`.replace(
      "https://",
      "wss://"
    );
    console.log("[ChatClient] Connecting =>", wsUrl);
    this.ws = new WebSocket(wsUrl, {
      headers: {
        Origin: "https://x.com",
        "User-Agent": "Mozilla/5.0"
      }
    });
    await this.setupHandlers();
  }
  setupHandlers() {
    if (!this.ws) throw new Error("No WebSocket instance");
    return new Promise((resolve, reject) => {
      this.ws.on("open", () => {
        console.log("[ChatClient] Connected");
        this.connected = true;
        this.sendAuthAndJoin();
        resolve();
      });
      this.ws.on("message", (data) => {
        this.handleMessage(data.toString());
      });
      this.ws.on("close", () => {
        console.log("[ChatClient] Closed");
        this.connected = false;
        this.emit("disconnected");
      });
      this.ws.on("error", (err) => {
        console.error("[ChatClient] Error =>", err);
        reject(err);
      });
    });
  }
  sendAuthAndJoin() {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        payload: JSON.stringify({ access_token: this.accessToken }),
        kind: 3
      })
    );
    this.ws.send(
      JSON.stringify({
        payload: JSON.stringify({
          body: JSON.stringify({ room: this.spaceId }),
          kind: 1
        }),
        kind: 2
      })
    );
  }
  reactWithEmoji(emoji) {
    if (!this.ws) return;
    const payload = JSON.stringify({
      body: JSON.stringify({ body: emoji, type: 2, v: 2 }),
      kind: 1,
      /*
      // The 'sender' field is not required, it's not even verified by the server
      // Instead of passing attributes down here it's easier to ignore it
      sender: {
        user_id: null,
        twitter_id: null,
        username: null,
        display_name: null,
      },
      */
      payload: JSON.stringify({
        room: this.spaceId,
        body: JSON.stringify({ body: emoji, type: 2, v: 2 })
      }),
      type: 2
    });
    this.ws.send(payload);
  }
  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg.payload) return;
    const payload = safeJson(msg.payload);
    if (!payload?.body) return;
    const body = safeJson(payload.body);
    if (body.guestBroadcastingEvent === 1) {
      const req = {
        userId: body.guestRemoteID,
        username: body.guestUsername,
        displayName: payload.sender?.display_name || body.guestUsername,
        sessionUUID: body.sessionUUID
      };
      this.emit("speakerRequest", req);
    }
    if (typeof body.occupancy === "number") {
      const update = {
        occupancy: body.occupancy,
        totalParticipants: body.total_participants || 0
      };
      this.emit("occupancyUpdate", update);
    }
    if (body.guestBroadcastingEvent === 16) {
      this.emit("muteStateChanged", {
        userId: body.guestRemoteID,
        muted: true
      });
    }
    if (body.guestBroadcastingEvent === 17) {
      this.emit("muteStateChanged", {
        userId: body.guestRemoteID,
        muted: false
      });
    }
    if (body?.type === 2) {
      console.log("[ChatClient] Emiting guest reaction event =>", body);
      this.emit("guestReaction", {
        displayName: body.displayName,
        emoji: body.body
      });
    }
  }
  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = void 0;
      this.connected = false;
    }
  }
}
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const { nonstandard } = wrtc;
const { RTCAudioSource, RTCAudioSink } = nonstandard;
class JanusAudioSource extends EventEmitter {
  constructor() {
    super();
    this.source = new RTCAudioSource();
    this.track = this.source.createTrack();
  }
  getTrack() {
    return this.track;
  }
  pushPcmData(samples, sampleRate, channels = 1) {
    this.source.onData({
      samples,
      sampleRate,
      bitsPerSample: 16,
      channelCount: channels,
      numberOfFrames: samples.length / channels
    });
  }
}
class JanusAudioSink extends EventEmitter {
  constructor(track) {
    super();
    this.active = true;
    if (track.kind !== "audio")
      throw new Error("JanusAudioSink must be an audio track");
    this.sink = new RTCAudioSink(track);
    this.sink.ondata = (frame) => {
      if (!this.active) return;
      this.emit("audioData", frame);
    };
  }
  stop() {
    this.active = false;
    this.sink?.stop();
  }
}

const { RTCPeerConnection, MediaStream } = wrtc;
class JanusClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.pollActive = false;
    this.eventWaiters = [];
    this.subscribers = /* @__PURE__ */ new Map();
  }
  async initialize() {
    this.sessionId = await this.createSession();
    this.handleId = await this.attachPlugin();
    this.pollActive = true;
    this.startPolling();
    await this.createRoom();
    this.publisherId = await this.joinRoom();
    this.pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: this.config.turnServers.uris,
          username: this.config.turnServers.username,
          credential: this.config.turnServers.password
        }
      ]
    });
    this.setupPeerEvents();
    this.enableLocalAudio();
    await this.configurePublisher();
    console.log("[JanusClient] Initialization complete");
  }
  async subscribeSpeaker(userId) {
    console.log("[JanusClient] subscribeSpeaker => userId=", userId);
    const subscriberHandleId = await this.attachPlugin();
    console.log("[JanusClient] subscriber handle =>", subscriberHandleId);
    const publishersEvt = await this.waitForJanusEvent(
      (e) => e.janus === "event" && e.plugindata?.plugin === "janus.plugin.videoroom" && e.plugindata?.data?.videoroom === "event" && Array.isArray(e.plugindata?.data?.publishers) && e.plugindata?.data?.publishers.length > 0,
      8e3,
      'discover feed_id from "publishers"'
    );
    const list = publishersEvt.plugindata.data.publishers;
    const pub = list.find(
      (p) => p.display === userId || p.periscope_user_id === userId
    );
    if (!pub) {
      throw new Error(
        `[JanusClient] subscribeSpeaker => No publisher found for userId=${userId}`
      );
    }
    const feedId = pub.id;
    console.log("[JanusClient] found feedId =>", feedId);
    this.emit("subscribedSpeaker", { userId, feedId });
    const joinBody = {
      request: "join",
      room: this.config.roomId,
      periscope_user_id: this.config.userId,
      ptype: "subscriber",
      streams: [
        {
          feed: feedId,
          mid: "0",
          send: true
        }
      ]
    };
    await this.sendJanusMessage(subscriberHandleId, joinBody);
    const attachedEvt = await this.waitForJanusEvent(
      (e) => e.janus === "event" && e.sender === subscriberHandleId && e.plugindata?.plugin === "janus.plugin.videoroom" && e.plugindata?.data?.videoroom === "attached" && e.jsep?.type === "offer",
      8e3,
      "subscriber attached + offer"
    );
    console.log('[JanusClient] subscriber => "attached" with offer');
    const offer = attachedEvt.jsep;
    const subPc = new RTCPeerConnection({
      iceServers: [
        {
          urls: this.config.turnServers.uris,
          username: this.config.turnServers.username,
          credential: this.config.turnServers.password
        }
      ]
    });
    subPc.ontrack = (evt) => {
      console.log("[JanusClient] subscriber track =>", evt.track.kind);
      const sink = new JanusAudioSink(evt.track);
      sink.on("audioData", (frame) => {
        this.emit("audioDataFromSpeaker", {
          userId,
          bitsPerSample: frame.bitsPerSample,
          sampleRate: frame.sampleRate,
          numberOfFrames: frame.numberOfFrames,
          channelCount: frame.channelCount,
          samples: frame.samples
        });
      });
    };
    await subPc.setRemoteDescription(offer);
    const answer = await subPc.createAnswer();
    await subPc.setLocalDescription(answer);
    await this.sendJanusMessage(
      subscriberHandleId,
      {
        request: "start",
        room: this.config.roomId,
        periscope_user_id: this.config.userId
      },
      answer
    );
    console.log("[JanusClient] subscriber => done (user=", userId, ")");
    this.subscribers.set(userId, { handleId: subscriberHandleId, pc: subPc });
  }
  pushLocalAudio(samples, sampleRate, channels = 1) {
    if (!this.localAudioSource) {
      console.warn("[JanusClient] No localAudioSource; enabling now...");
      this.enableLocalAudio();
    }
    this.localAudioSource?.pushPcmData(samples, sampleRate, channels);
  }
  enableLocalAudio() {
    if (!this.pc) {
      console.warn("[JanusClient] No RTCPeerConnection");
      return;
    }
    if (this.localAudioSource) {
      console.log("[JanusClient] localAudioSource already active");
      return;
    }
    this.localAudioSource = new JanusAudioSource();
    const track = this.localAudioSource.getTrack();
    const localStream = new MediaStream();
    localStream.addTrack(track);
    this.pc.addTrack(track, localStream);
  }
  async stop() {
    console.log("[JanusClient] Stopping...");
    this.pollActive = false;
    if (this.pc) {
      this.pc.close();
      this.pc = void 0;
    }
  }
  getSessionId() {
    return this.sessionId;
  }
  getHandleId() {
    return this.handleId;
  }
  getPublisherId() {
    return this.publisherId;
  }
  // ------------------- Private Methods --------------------
  async createSession() {
    const transaction = this.randomTid();
    const resp = await fetch(this.config.webrtcUrl, {
      method: "POST",
      headers: {
        Authorization: this.config.credential,
        "Content-Type": "application/json",
        Referer: "https://x.com"
      },
      body: JSON.stringify({
        janus: "create",
        transaction
      })
    });
    if (!resp.ok) throw new Error("[JanusClient] createSession failed");
    const json = await resp.json();
    if (json.janus !== "success")
      throw new Error("[JanusClient] createSession invalid response");
    return json.data.id;
  }
  async attachPlugin() {
    if (!this.sessionId) throw new Error("[JanusClient] no sessionId");
    const transaction = this.randomTid();
    const resp = await fetch(`${this.config.webrtcUrl}/${this.sessionId}`, {
      method: "POST",
      headers: {
        Authorization: this.config.credential,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        janus: "attach",
        plugin: "janus.plugin.videoroom",
        transaction
      })
    });
    if (!resp.ok) throw new Error("[JanusClient] attachPlugin failed");
    const json = await resp.json();
    if (json.janus !== "success")
      throw new Error("[JanusClient] attachPlugin invalid response");
    return json.data.id;
  }
  async createRoom() {
    if (!this.sessionId || !this.handleId) {
      throw new Error("[JanusClient] No session/handle");
    }
    const transaction = this.randomTid();
    const body = {
      request: "create",
      room: this.config.roomId,
      periscope_user_id: this.config.userId,
      audiocodec: "opus",
      videocodec: "h264",
      transport_wide_cc_ext: true,
      app_component: "audio-room",
      h264_profile: "42e01f",
      dummy_publisher: false
    };
    const resp = await fetch(
      `${this.config.webrtcUrl}/${this.sessionId}/${this.handleId}`,
      {
        method: "POST",
        headers: {
          Authorization: this.config.credential,
          "Content-Type": "application/json",
          Referer: "https://x.com"
        },
        body: JSON.stringify({
          janus: "message",
          transaction,
          body
        })
      }
    );
    if (!resp.ok) {
      throw new Error(`[JanusClient] createRoom failed => ${resp.status}`);
    }
    const json = await resp.json();
    console.log("[JanusClient] createRoom =>", JSON.stringify(json));
    if (json.janus === "error") {
      throw new Error(
        `[JanusClient] createRoom error => ${json.error?.reason || "Unknown error"}`
      );
    }
    if (json.plugindata?.data?.videoroom !== "created") {
      throw new Error(
        `[JanusClient] unexpected createRoom response => ${JSON.stringify(
          json
        )}`
      );
    }
    console.log(
      `[JanusClient] Room '${this.config.roomId}' created successfully`
    );
  }
  async joinRoom() {
    if (!this.sessionId || !this.handleId)
      throw new Error("[JanusClient] no session/handle");
    const evtPromise = this.waitForJanusEvent(
      (e) => {
        return e.janus === "event" && e.plugindata?.plugin === "janus.plugin.videoroom" && e.plugindata?.data?.videoroom === "joined";
      },
      12e3,
      "Host Joined Event"
    );
    const body = {
      request: "join",
      room: this.config.roomId,
      ptype: "publisher",
      display: this.config.userId,
      periscope_user_id: this.config.userId
    };
    await this.sendJanusMessage(this.handleId, body);
    const evt = await evtPromise;
    const publisherId = evt.plugindata.data.id;
    console.log("[JanusClient] joined room => publisherId=", publisherId);
    return publisherId;
  }
  async configurePublisher() {
    if (!this.pc || !this.sessionId || !this.handleId) return;
    console.log("[JanusClient] createOffer...");
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await this.pc.setLocalDescription(offer);
    console.log("[JanusClient] sending configure with JSEP...");
    await this.sendJanusMessage(
      this.handleId,
      {
        request: "configure",
        room: this.config.roomId,
        periscope_user_id: this.config.userId,
        session_uuid: "",
        stream_name: this.config.streamName,
        vidman_token: this.config.credential
      },
      offer
    );
    console.log("[JanusClient] waiting for answer...");
  }
  async sendJanusMessage(handleId, body, jsep) {
    if (!this.sessionId) {
      throw new Error("[JanusClient] No session");
    }
    const transaction = this.randomTid();
    const resp = await fetch(
      `${this.config.webrtcUrl}/${this.sessionId}/${handleId}`,
      {
        method: "POST",
        headers: {
          Authorization: this.config.credential,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          janus: "message",
          transaction,
          body,
          jsep
        })
      }
    );
    if (!resp.ok) {
      throw new Error(
        "[JanusClient] sendJanusMessage failed => " + resp.status
      );
    }
  }
  startPolling() {
    console.log("[JanusClient] Starting polling...");
    const doPoll = async () => {
      if (!this.pollActive || !this.sessionId) {
        console.log("[JanusClient] Polling stopped");
        return;
      }
      try {
        const url = `${this.config.webrtcUrl}/${this.sessionId}?maxev=1&_=${Date.now()}`;
        const resp = await fetch(url, {
          headers: { Authorization: this.config.credential }
        });
        if (resp.ok) {
          const event = await resp.json();
          this.handleJanusEvent(event);
        } else {
          console.log("[JanusClient] poll error =>", resp.status);
        }
      } catch (err) {
        console.error("[JanusClient] poll exception =>", err);
      }
      setTimeout(doPoll, 500);
    };
    doPoll();
  }
  handleJanusEvent(evt) {
    if (!evt.janus) return;
    if (evt.janus === "keepalive") {
      return;
    }
    if (evt.janus === "webrtcup") {
      console.log("[JanusClient] webrtcup =>", evt.sender);
    }
    if (evt.jsep && evt.jsep.type === "answer") {
      this.onReceivedAnswer(evt.jsep);
    }
    if (evt.plugindata?.data?.id) {
      this.publisherId = evt.plugindata.data.id;
    }
    if (evt.error) {
      console.error("[JanusClient] Janus error =>", evt.error.reason);
      this.emit("error", new Error(evt.error.reason));
    }
    for (let i = 0; i < this.eventWaiters.length; i++) {
      const waiter = this.eventWaiters[i];
      if (waiter.predicate(evt)) {
        this.eventWaiters.splice(i, 1);
        waiter.resolve(evt);
        break;
      }
    }
  }
  async onReceivedAnswer(answer) {
    if (!this.pc) return;
    console.log("[JanusClient] got answer => setRemoteDescription");
    await this.pc.setRemoteDescription(answer);
  }
  setupPeerEvents() {
    if (!this.pc) return;
    this.pc.addEventListener("iceconnectionstatechange", () => {
      if (this.pc?.iceConnectionState === "failed") {
        this.emit("error", new Error("ICE connection failed"));
      }
    });
    this.pc.addEventListener("track", (evt) => {
      console.log("[JanusClient] track =>", evt.track.kind);
    });
  }
  randomTid() {
    return Math.random().toString(36).slice(2, 10);
  }
  /**
   * Allows code to wait for a specific Janus event that matches a predicate
   */
  async waitForJanusEvent(predicate, timeoutMs = 5e3, description = "some event") {
    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        reject
      };
      this.eventWaiters.push(waiter);
      setTimeout(() => {
        const idx = this.eventWaiters.indexOf(waiter);
        if (idx !== -1) {
          this.eventWaiters.splice(idx, 1);
          console.log(
            `[JanusClient] waitForJanusEvent => timed out waiting for: ${description}`
          );
          reject(
            new Error(
              `[JanusClient] waitForJanusEvent (expecting "${description}") timed out after ${timeoutMs}ms`
            )
          );
        }
      }, timeoutMs);
    });
  }
  async destroyRoom() {
    if (!this.sessionId || !this.handleId) {
      console.warn("[JanusClient] destroyRoom => no session/handle");
      return;
    }
    if (!this.config.roomId || !this.config.userId) {
      console.warn("[JanusClient] destroyRoom => no roomId/userId");
      return;
    }
    const transaction = this.randomTid();
    const body = {
      request: "destroy",
      room: this.config.roomId,
      periscope_user_id: this.config.userId
    };
    console.log("[JanusClient] destroying room =>", body);
    const resp = await fetch(
      `${this.config.webrtcUrl}/${this.sessionId}/${this.handleId}`,
      {
        method: "POST",
        headers: {
          Authorization: this.config.credential,
          "Content-Type": "application/json",
          Referer: "https://x.com"
        },
        body: JSON.stringify({
          janus: "message",
          transaction,
          body
        })
      }
    );
    if (!resp.ok) {
      throw new Error(`[JanusClient] destroyRoom failed => ${resp.status}`);
    }
    const json = await resp.json();
    console.log("[JanusClient] destroyRoom =>", JSON.stringify(json));
  }
  async leaveRoom() {
    if (!this.sessionId || !this.handleId) {
      console.warn("[JanusClient] leaveRoom => no session/handle");
      return;
    }
    const transaction = this.randomTid();
    const body = {
      request: "leave",
      room: this.config.roomId,
      periscope_user_id: this.config.userId
    };
    console.log("[JanusClient] leaving room =>", body);
    const resp = await fetch(
      `${this.config.webrtcUrl}/${this.sessionId}/${this.handleId}`,
      {
        method: "POST",
        headers: {
          Authorization: this.config.credential,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          janus: "message",
          transaction,
          body
        })
      }
    );
    if (!resp.ok) {
      throw new Error(`[JanusClient] leaveRoom => error code ${resp.status}`);
    }
    const json = await resp.json();
    console.log("[JanusClient] leaveRoom =>", JSON.stringify(json));
  }
}

async function authorizeToken(cookie) {
  const headers = new Headers$1({
    "X-Periscope-User-Agent": "Twitter/m5",
    "Content-Type": "application/json",
    "X-Idempotence": Date.now().toString(),
    Referer: "https://x.com/",
    "X-Attempt": "1"
  });
  const resp = await fetch("https://proxsee.pscp.tv/api/v2/authorizeToken", {
    method: "POST",
    headers,
    body: JSON.stringify({
      service: "guest",
      cookie
    })
  });
  if (!resp.ok) {
    throw new Error(`Failed to authorize token => ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.authorization_token) {
    throw new Error("authorizeToken: Missing authorization_token in response");
  }
  return data.authorization_token;
}
async function publishBroadcast(params) {
  const headers = new Headers$1({
    "X-Periscope-User-Agent": "Twitter/m5",
    "Content-Type": "application/json",
    Referer: "https://x.com/",
    "X-Idempotence": Date.now().toString(),
    "X-Attempt": "1"
  });
  await fetch("https://proxsee.pscp.tv/api/v2/publishBroadcast", {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept_guests: true,
      broadcast_id: params.broadcast.room_id,
      webrtc_handle_id: params.janusHandleId,
      webrtc_session_id: params.janusSessionId,
      janus_publisher_id: params.janusPublisherId,
      janus_room_id: params.broadcast.room_id,
      cookie: params.cookie,
      status: params.title,
      conversation_controls: 0
    })
  });
}
async function getTurnServers(cookie) {
  const headers = new Headers$1({
    "X-Periscope-User-Agent": "Twitter/m5",
    "Content-Type": "application/json",
    Referer: "https://x.com/",
    "X-Idempotence": Date.now().toString(),
    "X-Attempt": "1"
  });
  const resp = await fetch("https://proxsee.pscp.tv/api/v2/turnServers", {
    method: "POST",
    headers,
    body: JSON.stringify({ cookie })
  });
  if (!resp.ok) throw new Error("Failed to get turn servers => " + resp.status);
  return resp.json();
}
async function getRegion() {
  const resp = await fetch("https://signer.pscp.tv/region", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://x.com"
    },
    body: JSON.stringify({})
  });
  if (!resp.ok) {
    throw new Error(`Failed to get region => ${resp.status}`);
  }
  const data = await resp.json();
  return data.region;
}
async function createBroadcast(params) {
  const headers = new Headers$1({
    "X-Periscope-User-Agent": "Twitter/m5",
    "Content-Type": "application/json",
    "X-Idempotence": Date.now().toString(),
    Referer: "https://x.com/",
    "X-Attempt": "1"
  });
  const resp = await fetch("https://proxsee.pscp.tv/api/v2/createBroadcast", {
    method: "POST",
    headers,
    body: JSON.stringify({
      app_component: "audio-room",
      content_type: "visual_audio",
      cookie: params.cookie,
      conversation_controls: 0,
      description: params.description || "",
      height: 1080,
      is_360: false,
      is_space_available_for_replay: false,
      is_webrtc: true,
      languages: params.languages ?? [],
      region: params.region,
      width: 1920
    })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to create broadcast => ${resp.status} ${text}`);
  }
  const data = await resp.json();
  return data;
}

class Space extends EventEmitter {
  constructor(scraper) {
    super();
    this.scraper = scraper;
    this.isInitialized = false;
    this.plugins = /* @__PURE__ */ new Set();
    this.speakers = /* @__PURE__ */ new Map();
  }
  use(plugin, config) {
    const registration = { plugin, config };
    this.plugins.add(registration);
    console.log("[Space] Plugin added =>", plugin.constructor.name);
    plugin.onAttach?.(this);
    if (this.isInitialized && plugin.init) {
      plugin.init({
        space: this,
        pluginConfig: config
      });
    }
    return this;
  }
  /**
   * Main entry point
   */
  async initialize(config) {
    console.log("[Space] Initializing...");
    const cookie = await this.scraper.getPeriscopeCookie();
    const region = await getRegion();
    console.log("[Space] Got region =>", region);
    console.log("[Space] Creating broadcast...");
    const broadcast = await createBroadcast({
      description: config.description,
      languages: config.languages,
      cookie,
      region
    });
    this.broadcastInfo = broadcast;
    console.log("[Space] Authorizing token...");
    this.authToken = await authorizeToken(cookie);
    console.log("[Space] Getting turn servers...");
    const turnServers = await getTurnServers(cookie);
    this.janusClient = new JanusClient({
      webrtcUrl: broadcast.webrtc_gw_url,
      roomId: broadcast.room_id,
      credential: broadcast.credential,
      userId: broadcast.broadcast.user_id,
      streamName: broadcast.stream_name,
      turnServers
    });
    await this.janusClient.initialize();
    this.janusClient.on("audioDataFromSpeaker", (data) => {
      this.handleAudioData(data);
    });
    this.janusClient.on("subscribedSpeaker", ({ userId, feedId }) => {
      const speaker = this.speakers.get(userId);
      if (!speaker) {
        console.log(
          "[Space] subscribedSpeaker => speaker not found for userId=",
          userId
        );
        return;
      }
      speaker.janusParticipantId = feedId;
      console.log(
        `[Space] updated speaker info => userId=${userId}, feedId=${feedId}`
      );
    });
    console.log("[Space] Publishing broadcast...");
    await publishBroadcast({
      title: config.title || "",
      broadcast,
      cookie,
      janusSessionId: this.janusClient.getSessionId(),
      janusHandleId: this.janusClient.getHandleId(),
      janusPublisherId: this.janusClient.getPublisherId()
    });
    if (config.mode === "INTERACTIVE") {
      console.log("[Space] Connecting chat...");
      this.chatClient = new ChatClient(
        broadcast.room_id,
        broadcast.access_token,
        broadcast.endpoint
      );
      await this.chatClient.connect();
      this.setupChatEvents();
    }
    this.isInitialized = true;
    console.log("[Space] Initialized =>", broadcast.share_url);
    for (const { plugin, config: pluginConfig } of this.plugins) {
      if (plugin.init) {
        plugin.init({
          space: this,
          pluginConfig
        });
      }
    }
    console.log("[Space] All plugins initialized");
    return broadcast;
  }
  reactWithEmoji(emoji) {
    if (!this.chatClient) return;
    this.chatClient.reactWithEmoji(emoji);
  }
  setupChatEvents() {
    if (!this.chatClient) return;
    this.chatClient.on("speakerRequest", (req) => {
      console.log("[Space] Speaker request =>", req);
      this.emit("speakerRequest", req);
    });
    this.chatClient.on("occupancyUpdate", (update) => {
      this.emit("occupancyUpdate", update);
    });
    this.chatClient.on("muteStateChanged", (evt) => {
      this.emit("muteStateChanged", evt);
    });
    this.chatClient.on("guestReaction", (reaction) => {
      console.log("[Space] Guest reaction =>", reaction);
      this.emit("guestReaction", reaction);
    });
  }
  /**
   * Approves a speaker on Periscope side, then subscribes on Janus side
   */
  async approveSpeaker(userId, sessionUUID) {
    if (!this.isInitialized || !this.broadcastInfo) {
      throw new Error("[Space] Not initialized or no broadcastInfo");
    }
    if (!this.authToken) {
      throw new Error("[Space] No auth token available");
    }
    this.speakers.set(userId, {
      userId,
      sessionUUID
    });
    await this.callApproveEndpoint(
      this.broadcastInfo,
      this.authToken,
      userId,
      sessionUUID
    );
    await this.janusClient?.subscribeSpeaker(userId);
  }
  async callApproveEndpoint(broadcast, authorizationToken, userId, sessionUUID) {
    const endpoint = "https://guest.pscp.tv/api/v1/audiospace/request/approve";
    const headers = {
      "Content-Type": "application/json",
      Referer: "https://x.com/",
      Authorization: authorizationToken
    };
    const body = {
      ntpForBroadcasterFrame: "2208988800024000300",
      ntpForLiveFrame: "2208988800024000300",
      chat_token: broadcast.access_token,
      session_uuid: sessionUUID
    };
    console.log("[Space] Approving speaker =>", endpoint, body);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const error = await resp.text();
      throw new Error(
        `[Space] Failed to approve speaker => ${resp.status}: ${error}`
      );
    }
    console.log("[Space] Speaker approved =>", userId);
  }
  /**
   * Removes a speaker (userId) on the Twitter side (audiospace/stream/eject)
   * then unsubscribes in Janus if needed.
   */
  async removeSpeaker(userId) {
    if (!this.isInitialized || !this.broadcastInfo) {
      throw new Error("[Space] Not initialized or no broadcastInfo");
    }
    if (!this.authToken) {
      throw new Error("[Space] No auth token available");
    }
    if (!this.janusClient) {
      throw new Error("[Space] No Janus client initialized");
    }
    const speaker = this.speakers.get(userId);
    if (!speaker) {
      throw new Error(
        `[Space] removeSpeaker => no speaker found for userId=${userId}`
      );
    }
    const sessionUUID = speaker.sessionUUID;
    const janusParticipantId = speaker.janusParticipantId;
    console.log(sessionUUID, janusParticipantId, speaker);
    if (!sessionUUID || janusParticipantId === void 0) {
      throw new Error(
        `[Space] removeSpeaker => missing sessionUUID or feedId for userId=${userId}`
      );
    }
    const janusHandleId = this.janusClient.getHandleId();
    const janusSessionId = this.janusClient.getSessionId();
    if (!janusHandleId || !janusSessionId) {
      throw new Error(
        `[Space] removeSpeaker => missing Janus handle or sessionId for userId=${userId}`
      );
    }
    await this.callRemoveEndpoint(
      this.broadcastInfo,
      this.authToken,
      sessionUUID,
      janusParticipantId,
      this.broadcastInfo.room_id,
      janusHandleId,
      janusSessionId
    );
    this.speakers.delete(userId);
    console.log(`[Space] removeSpeaker => removed userId=${userId}`);
  }
  /**
   * Calls the audiospace/stream/eject endpoint to remove a speaker on Twitter
   */
  async callRemoveEndpoint(broadcast, authorizationToken, sessionUUID, janusParticipantId, janusRoomId, webrtcHandleId, webrtcSessionId) {
    const endpoint = "https://guest.pscp.tv/api/v1/audiospace/stream/eject";
    const headers = {
      "Content-Type": "application/json",
      Referer: "https://x.com/",
      Authorization: authorizationToken
    };
    const body = {
      ntpForBroadcasterFrame: "2208988800024000300",
      ntpForLiveFrame: "2208988800024000300",
      session_uuid: sessionUUID,
      chat_token: broadcast.access_token,
      janus_room_id: janusRoomId,
      janus_participant_id: janusParticipantId,
      webrtc_handle_id: webrtcHandleId,
      webrtc_session_id: webrtcSessionId
    };
    console.log("[Space] Removing speaker =>", endpoint, body);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const error = await resp.text();
      throw new Error(
        `[Space] Failed to remove speaker => ${resp.status}: ${error}`
      );
    }
    console.log("[Space] Speaker removed => sessionUUID=", sessionUUID);
  }
  pushAudio(samples, sampleRate) {
    this.janusClient?.pushLocalAudio(samples, sampleRate);
  }
  /**
   * This method is called by JanusClient on 'audioDataFromSpeaker'
   * or we do it from the 'initialize(...)' once Janus is set up.
   */
  handleAudioData(data) {
    for (const { plugin } of this.plugins) {
      plugin.onAudioData?.(data);
    }
  }
  /**
   * Gracefully end the Space (stop broadcast, destroy Janus room, etc.)
   */
  async finalizeSpace() {
    console.log("[Space] finalizeSpace => stopping broadcast gracefully");
    const tasks = [];
    if (this.janusClient) {
      tasks.push(
        this.janusClient.destroyRoom().catch((err) => {
          console.error("[Space] destroyRoom error =>", err);
        })
      );
    }
    if (this.broadcastInfo) {
      tasks.push(
        this.endAudiospace({
          broadcastId: this.broadcastInfo.room_id,
          chatToken: this.broadcastInfo.access_token
        }).catch((err) => {
          console.error("[Space] endAudiospace error =>", err);
        })
      );
    }
    if (this.janusClient) {
      tasks.push(
        this.janusClient.leaveRoom().catch((err) => {
          console.error("[Space] leaveRoom error =>", err);
        })
      );
    }
    await Promise.all(tasks);
    console.log("[Space] finalizeSpace => done.");
  }
  /**
   * Calls the endAudiospace endpoint from Twitter
   */
  async endAudiospace(params) {
    const url = "https://guest.pscp.tv/api/v1/audiospace/admin/endAudiospace";
    const headers = {
      "Content-Type": "application/json",
      Referer: "https://x.com/",
      Authorization: this.authToken || ""
    };
    const body = {
      broadcast_id: params.broadcastId,
      chat_token: params.chatToken
    };
    console.log("[Space] endAudiospace =>", body);
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`[Space] endAudiospace => ${resp.status} ${errText}`);
    }
    const json = await resp.json();
    console.log("[Space] endAudiospace => success =>", json);
  }
  getSpeakers() {
    return Array.from(this.speakers.values());
  }
  async stop() {
    console.log("[Space] Stopping...");
    await this.finalizeSpace().catch((err) => {
      console.error("[Space] finalizeBroadcast error =>", err);
    });
    if (this.chatClient) {
      await this.chatClient.disconnect();
      this.chatClient = void 0;
    }
    if (this.janusClient) {
      await this.janusClient.stop();
      this.janusClient = void 0;
    }
    for (const { plugin } of this.plugins) {
      plugin.cleanup?.();
    }
    this.plugins.clear();
    this.isInitialized = false;
  }
}

class SttTtsPlugin {
  constructor() {
    this.sttLanguage = "en";
    this.gptModel = "gpt-3.5-turbo";
    this.voiceId = "21m00Tcm4TlvDq8ikWAM";
    this.elevenLabsModel = "eleven_monolingual_v1";
    this.systemPrompt = "You are a helpful AI assistant.";
    this.chatContext = [];
    /**
     * userId => arrayOfChunks (PCM Int16)
     */
    this.pcmBuffers = /* @__PURE__ */ new Map();
    /**
     * Track mute states: userId => boolean (true=unmuted)
     */
    this.speakerUnmuted = /* @__PURE__ */ new Map();
    /**
     * For ignoring near-silence frames (if amplitude < threshold)
     */
    this.silenceThreshold = 50;
  }
  // default amplitude threshold
  onAttach(space) {
    console.log("[SttTtsPlugin] onAttach => space was attached");
  }
  init(params) {
    console.log(
      "[SttTtsPlugin] init => Space fully ready. Subscribing to events."
    );
    this.space = params.space;
    this.janus = this.space?.janusClient;
    const config = params.pluginConfig;
    this.openAiApiKey = config?.openAiApiKey;
    this.elevenLabsApiKey = config?.elevenLabsApiKey;
    if (config?.sttLanguage) this.sttLanguage = config.sttLanguage;
    if (config?.gptModel) this.gptModel = config.gptModel;
    if (typeof config?.silenceThreshold === "number") {
      this.silenceThreshold = config.silenceThreshold;
    }
    if (config?.voiceId) {
      this.voiceId = config.voiceId;
    }
    if (config?.elevenLabsModel) {
      this.voiceId = config.elevenLabsModel;
    }
    if (config.systemPrompt) {
      this.systemPrompt = config.systemPrompt;
    }
    if (config.chatContext) {
      this.chatContext = config.chatContext;
    }
    console.log("[SttTtsPlugin] Plugin config =>", config);
    this.space.on(
      "muteStateChanged",
      (evt) => {
        console.log("[SttTtsPlugin] Speaker muteStateChanged =>", evt);
        if (evt.muted) {
          this.handleMute(evt.userId).catch(
            (err) => console.error("[SttTtsPlugin] handleMute error =>", err)
          );
        } else {
          this.speakerUnmuted.set(evt.userId, true);
          if (!this.pcmBuffers.has(evt.userId)) {
            this.pcmBuffers.set(evt.userId, []);
          }
        }
      }
    );
  }
  /**
   * Called whenever we receive PCM from a speaker
   */
  onAudioData(data) {
    if (!this.speakerUnmuted.get(data.userId)) return;
    let maxVal = 0;
    for (let i = 0; i < data.samples.length; i++) {
      const val = Math.abs(data.samples[i]);
      if (val > maxVal) maxVal = val;
    }
    if (maxVal < this.silenceThreshold) {
      return;
    }
    let arr = this.pcmBuffers.get(data.userId);
    if (!arr) {
      arr = [];
      this.pcmBuffers.set(data.userId, arr);
    }
    arr.push(data.samples);
  }
  /**
   * On speaker mute => flush STT => GPT => TTS => push to Janus
   */
  async handleMute(userId) {
    this.speakerUnmuted.set(userId, false);
    const chunks = this.pcmBuffers.get(userId) || [];
    this.pcmBuffers.set(userId, []);
    if (!chunks.length) {
      console.log("[SttTtsPlugin] No audio chunks for user =>", userId);
      return;
    }
    console.log(
      `[SttTtsPlugin] Flushing STT buffer for user=${userId}, total chunks=${chunks.length}`
    );
    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Int16Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const wavPath = await this.convertPcmToWav(merged, 48e3);
    console.log("[SttTtsPlugin] WAV ready =>", wavPath);
    const sttText = await this.transcribeWithOpenAI(wavPath, this.sttLanguage);
    fs__default.unlinkSync(wavPath);
    if (!sttText.trim()) {
      console.log("[SttTtsPlugin] No speech recognized for user =>", userId);
      return;
    }
    console.log(`[SttTtsPlugin] STT => user=${userId}, text="${sttText}"`);
    const replyText = await this.askChatGPT(sttText);
    console.log(`[SttTtsPlugin] GPT => user=${userId}, reply="${replyText}"`);
    const ttsAudio = await this.elevenLabsTts(replyText);
    console.log("[SttTtsPlugin] TTS => got MP3 size=", ttsAudio.length);
    const pcm = await this.convertMp3ToPcm(ttsAudio, 48e3);
    console.log(
      "[SttTtsPlugin] TTS => converted to PCM => frames=",
      pcm.length
    );
    if (this.janus) {
      await this.streamToJanus(pcm, 48e3);
      console.log("[SttTtsPlugin] TTS => done streaming to space");
    }
  }
  /**
   * Convert Int16 PCM -> WAV using ffmpeg
   */
  convertPcmToWav(samples, sampleRate) {
    return new Promise((resolve, reject) => {
      const tmpPath = path.resolve("/tmp", `stt-${Date.now()}.wav`);
      const ff = spawn("ffmpeg", [
        "-f",
        "s16le",
        "-ar",
        sampleRate.toString(),
        "-ac",
        "1",
        "-i",
        "pipe:0",
        "-y",
        tmpPath
      ]);
      ff.stdin.write(Buffer.from(samples.buffer));
      ff.stdin.end();
      ff.on("close", (code) => {
        if (code === 0) resolve(tmpPath);
        else reject(new Error(`ffmpeg error code=${code}`));
      });
    });
  }
  /**
   * OpenAI Whisper STT
   */
  async transcribeWithOpenAI(wavPath, language) {
    if (!this.openAiApiKey) {
      throw new Error("[SttTtsPlugin] No OpenAI API key available");
    }
    try {
      console.log("[SttTtsPlugin] Transcribe =>", wavPath);
      const fileBuffer = fs__default.readFileSync(wavPath);
      console.log(
        "[SttTtsPlugin] File read, size:",
        fileBuffer.length,
        "bytes"
      );
      const blob = new Blob([fileBuffer], { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", blob, path.basename(wavPath));
      formData.append("model", "whisper-1");
      formData.append("language", language);
      formData.append("temperature", "0");
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.openAiApiKey}`
          },
          body: formData
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SttTtsPlugin] API Error:", errorText);
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      const text = data.text?.trim() || "";
      console.log("[SttTtsPlugin] Transcription =>", text);
      return text;
    } catch (err) {
      console.error("[SttTtsPlugin] OpenAI STT Error =>", err);
      throw new Error("OpenAI STT failed");
    }
  }
  /**
   * Simple ChatGPT call
   */
  async askChatGPT(userText) {
    if (!this.openAiApiKey) {
      throw new Error("[SttTtsPlugin] No OpenAI API key for ChatGPT");
    }
    const url = "https://api.openai.com/v1/chat/completions";
    const messages = [
      { role: "system", content: this.systemPrompt },
      ...this.chatContext,
      { role: "user", content: userText }
    ];
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.gptModel,
        messages
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(
        `[SttTtsPlugin] ChatGPT error => ${resp.status} ${errText}`
      );
    }
    const json = await resp.json();
    const reply = json.choices?.[0]?.message?.content || "";
    this.chatContext.push({ role: "user", content: userText });
    this.chatContext.push({ role: "assistant", content: reply });
    return reply.trim();
  }
  /**
   * ElevenLabs TTS => returns MP3 Buffer
   */
  async elevenLabsTts(text) {
    if (!this.elevenLabsApiKey) {
      throw new Error("[SttTtsPlugin] No ElevenLabs API key");
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.elevenLabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: this.elevenLabsModel,
        voice_settings: { stability: 0.4, similarity_boost: 0.8 }
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(
        `[SttTtsPlugin] ElevenLabs TTS error => ${resp.status} ${errText}`
      );
    }
    const arrayBuf = await resp.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  /**
   * Convert MP3 => PCM via ffmpeg
   */
  convertMp3ToPcm(mp3Buf, outRate) {
    return new Promise((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-ar",
        outRate.toString(),
        "-ac",
        "1",
        "pipe:1"
      ]);
      let raw = Buffer.alloc(0);
      ff.stdout.on("data", (chunk) => {
        raw = Buffer.concat([raw, chunk]);
      });
      ff.stderr.on("data", () => {
      });
      ff.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg error code=${code}`));
          return;
        }
        const samples = new Int16Array(
          raw.buffer,
          raw.byteOffset,
          raw.byteLength / 2
        );
        resolve(samples);
      });
      ff.stdin.write(mp3Buf);
      ff.stdin.end();
    });
  }
  /**
   * Push PCM back to Janus in small frames
   * We'll do 10ms @48k => 960 samples per frame
   */
  async streamToJanus(samples, sampleRate) {
    const FRAME_SIZE = 480;
    for (let offset = 0; offset + FRAME_SIZE <= samples.length; offset += FRAME_SIZE) {
      const frame = new Int16Array(FRAME_SIZE);
      frame.set(samples.subarray(offset, offset + FRAME_SIZE));
      this.janus?.pushLocalAudio(frame, sampleRate, 1);
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  async speakText(text) {
    const ttsAudio = await this.elevenLabsTts(text);
    const pcm = await this.convertMp3ToPcm(ttsAudio, 48e3);
    if (this.janus) {
      await this.streamToJanus(pcm, 48e3);
      console.log("[SttTtsPlugin] speakText => done streaming to space");
    }
  }
  /**
   * Change the system prompt at runtime.
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    console.log("[SttTtsPlugin] setSystemPrompt =>", prompt);
  }
  /**
   * Change the GPT model at runtime (e.g. "gpt-4", "gpt-3.5-turbo", etc.).
   */
  setGptModel(model) {
    this.gptModel = model;
    console.log("[SttTtsPlugin] setGptModel =>", model);
  }
  /**
   * Add a message (system, user or assistant) to the chat context.
   * E.g. to store conversation history or inject a persona.
   */
  addMessage(role, content) {
    this.chatContext.push({ role, content });
    console.log(
      `[SttTtsPlugin] addMessage => role=${role}, content=${content}`
    );
  }
  /**
   * Clear the chat context if needed.
   */
  clearChatContext() {
    this.chatContext = [];
    console.log("[SttTtsPlugin] clearChatContext => done");
  }
  cleanup() {
    console.log("[SttTtsPlugin] cleanup => releasing resources");
    this.pcmBuffers.clear();
    this.speakerUnmuted.clear();
  }
}

class RecordToDiskPlugin {
  constructor() {
    this.outStream = fs.createWriteStream("/tmp/speaker_audio.raw");
  }
  onAudioData(data) {
    const buf = Buffer.from(data.samples.buffer);
    this.outStream.write(buf);
  }
  cleanup() {
    this.outStream.end();
  }
}

class MonitorAudioPlugin {
  constructor(sampleRate = 48e3) {
    this.sampleRate = sampleRate;
    this.ffplay = spawn("ffplay", [
      "-f",
      "s16le",
      "-ar",
      this.sampleRate.toString(),
      // e.g. "16000"
      "-ac",
      "1",
      // mono
      "-nodisp",
      "-loglevel",
      "quiet",
      "-i",
      "pipe:0"
    ]);
    this.ffplay.on("error", (err) => {
      console.error("[MonitorAudioPlugin] ffplay error =>", err);
    });
    this.ffplay.on("close", (code) => {
      console.log("[MonitorAudioPlugin] ffplay closed => code=", code);
      this.ffplay = void 0;
    });
    console.log("[MonitorAudioPlugin] Started ffplay for real-time monitoring");
  }
  onAudioData(data) {
    if (!this.ffplay?.stdin.writable) return;
    const buf = Buffer.from(data.samples.buffer);
    this.ffplay.stdin.write(buf);
  }
  cleanup() {
    console.log("[MonitorAudioPlugin] Cleanup => stopping ffplay");
    if (this.ffplay) {
      this.ffplay.stdin.end();
      this.ffplay.kill();
      this.ffplay = void 0;
    }
  }
}

class IdleMonitorPlugin {
  /**
   * @param idleTimeoutMs How many ms of silence before triggering idle (default 60s)
   * @param checkEveryMs Interval for checking silence (default 10s)
   */
  constructor(idleTimeoutMs = 6e4, checkEveryMs = 1e4) {
    this.idleTimeoutMs = idleTimeoutMs;
    this.checkEveryMs = checkEveryMs;
    this.lastSpeakerAudioMs = Date.now();
    this.lastLocalAudioMs = Date.now();
  }
  onAttach(space) {
    this.space = space;
    console.log("[IdleMonitorPlugin] onAttach => plugin attached");
  }
  init(params) {
    this.space = params.space;
    console.log("[IdleMonitorPlugin] init => setting up idle checks");
    this.space.on("audioDataFromSpeaker", (data) => {
      this.lastSpeakerAudioMs = Date.now();
    });
    const originalPushAudio = this.space.pushAudio.bind(this.space);
    this.space.pushAudio = (samples, sampleRate) => {
      this.lastLocalAudioMs = Date.now();
      originalPushAudio(samples, sampleRate);
    };
    this.checkInterval = setInterval(() => this.checkIdle(), this.checkEveryMs);
  }
  checkIdle() {
    const now = Date.now();
    const lastAudio = Math.max(this.lastSpeakerAudioMs, this.lastLocalAudioMs);
    const idleMs = now - lastAudio;
    if (idleMs >= this.idleTimeoutMs) {
      console.log(
        "[IdleMonitorPlugin] idleTimeout => no audio for",
        idleMs,
        "ms"
      );
      this.space?.emit("idleTimeout", { idleMs });
    }
  }
  /**
   * Returns how many ms have passed since any audio was detected.
   */
  getIdleTimeMs() {
    const now = Date.now();
    const lastAudio = Math.max(this.lastSpeakerAudioMs, this.lastLocalAudioMs);
    return now - lastAudio;
  }
  cleanup() {
    console.log("[IdleMonitorPlugin] cleanup => stopping idle checks");
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = void 0;
    }
  }
}

export { IdleMonitorPlugin, MonitorAudioPlugin, RecordToDiskPlugin, Scraper, SearchMode, Space, SttTtsPlugin };
//# sourceMappingURL=index.mjs.map
