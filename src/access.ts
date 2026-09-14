import { UsageClient } from './client';
import { USAGE_HOSTS } from './consts';
import type { ApiKeyClassification, ApiKeyProbeResult, Region, UsageSnapshot } from './types';

/** Probe a key against Kimi Code membership plus both Open Platform regions. */
export async function probeApiKey(
	apiKey: string,
	fetchImpl?: typeof fetch,
	signal?: AbortSignal,
): Promise<ApiKeyProbeResult> {
	const membershipClient = new UsageClient(USAGE_HOSTS.membership, undefined, fetchImpl ?? fetch);
	const internationalClient = new UsageClient(USAGE_HOSTS.standardInternational, undefined, fetchImpl ?? fetch);
	const chinaClient = new UsageClient(USAGE_HOSTS.standardChina, undefined, fetchImpl ?? fetch);
	const [membership, international, china] = await Promise.all([
		membershipClient.fetchMembershipUsage(apiKey, signal),
		internationalClient.fetchBalance(apiKey, signal),
		chinaClient.fetchBalance(apiKey, signal),
	]);
	return {
		membership,
		standard: {
			international,
			china,
		},
	};
}

/** Classify the access a key appears to provide across membership and Standard API stations. */
export function classifyApiKeyProbe(probe: ApiKeyProbeResult): ApiKeyClassification {
	const membershipAccepted = isAccepted(probe.membership);
	const membershipConfirmed = probe.membership.status === 'ok';
	const standardRegions = (['international', 'china'] as const).filter((region) => isAccepted(probe.standard[region]));
	if (membershipAccepted && standardRegions.length === 0) {
		return {
			kind: 'membership',
			membershipAccepted,
			membershipConfirmed,
			standardRegions: [],
			probe,
		};
	}
	if (!membershipAccepted && standardRegions.length === 1) {
		return {
			kind: 'standard',
			membershipAccepted,
			membershipConfirmed,
			standardRegions,
			detectedRegion: standardRegions[0],
			probe,
		};
	}
	if (!membershipAccepted && standardRegions.length === 0 && allAuthErrors(probe)) {
		return {
			kind: 'invalid',
			membershipAccepted,
			membershipConfirmed,
			standardRegions: [],
			probe,
		};
	}
	return {
		kind: 'unknown',
		membershipAccepted,
		membershipConfirmed,
		standardRegions,
		detectedRegion: standardRegions.length === 1 ? standardRegions[0] : undefined,
		probe,
	};
}

/** Find a Standard API region with positive available balance. */
export async function findPositiveStandardBalance(
	apiKey: string,
	fetchImpl?: typeof fetch,
	signal?: AbortSignal,
): Promise<{ region: Region; snapshot: UsageSnapshot } | undefined> {
	const internationalClient = new UsageClient(USAGE_HOSTS.standardInternational, undefined, fetchImpl ?? fetch);
	const chinaClient = new UsageClient(USAGE_HOSTS.standardChina, undefined, fetchImpl ?? fetch);
	const [international, china] = await Promise.all([
		internationalClient.fetchBalance(apiKey, signal),
		chinaClient.fetchBalance(apiKey, signal),
	]);
	for (const region of ['international', 'china'] as const) {
		const snapshot = region === 'international' ? international : china;
		if (snapshot.status === 'ok' && (snapshot.balance?.availableBalance ?? 0) > 0) {
			return { region, snapshot };
		}
	}
	return undefined;
}

function isAccepted(snapshot: UsageSnapshot): boolean {
	return snapshot.status === 'ok' || snapshot.status === 'no-data';
}

function allAuthErrors(probe: ApiKeyProbeResult): boolean {
	return probe.membership.status === 'auth-error'
		&& probe.standard.international.status === 'auth-error'
		&& probe.standard.china.status === 'auth-error';
}