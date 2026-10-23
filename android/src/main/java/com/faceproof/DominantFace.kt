// SPDX-License-Identifier: Apache-2.0
package com.faceproof

import kotlin.math.abs
import kotlin.math.max

/**
 * Picks the subject when BlazeFace finds several faces. A face is dominant if it
 * is the largest, its center is near the image center, and its area is at least
 * [minAreaRatio] times the area of the next largest face. Otherwise returns null
 * and the caller reports MULTIPLE_FACES.
 *
 * Pure Kotlin with no Android types, so it is unit-tested on the JVM.
 */
internal object DominantFace {
  const val DEFAULT_MIN_AREA_RATIO = 1.5f
  const val DEFAULT_MAX_CENTER_OFFSET = 0.25f

  fun select(
    faces: List<FaceDetection>,
    minAreaRatio: Float = DEFAULT_MIN_AREA_RATIO,
    maxCenterOffset: Float = DEFAULT_MAX_CENTER_OFFSET
  ): FaceDetection? {
    if (faces.size <= 1) return faces.firstOrNull()
    val ranked = faces.sortedByDescending { area(it.box) }
    val largest = ranked[0]
    val centered = abs(largest.box.centerX - 0.5f) <= maxCenterOffset &&
      abs(largest.box.centerY - 0.5f) <= maxCenterOffset
    val clearlyLarger = area(largest.box) >= minAreaRatio * area(ranked[1].box)
    return if (centered && clearlyLarger) largest else null
  }

  fun area(box: FaceBox): Float = max(0f, box.nw) * max(0f, box.nh)
}