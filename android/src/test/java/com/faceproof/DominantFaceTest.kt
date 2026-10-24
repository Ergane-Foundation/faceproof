// SPDX-License-Identifier: Apache-2.0
package com.faceproof

import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

class DominantFaceTest {
  private fun face(nx: Float, ny: Float, nw: Float, nh: Float) =
    FaceDetection(FaceBox(nx, ny, nw, nh), FloatArray(0), 0.9f)

  // Centered face, area 0.12.
  private val subject = face(0.35f, 0.3f, 0.3f, 0.4f)

  // Small face in the corner, area 0.03.
  private val bystander = face(0.0f, 0.0f, 0.15f, 0.2f)

  @Test
  fun noFacesReturnsNull() {
    assertNull(DominantFace.select(emptyList()))
  }

  @Test
  fun singleFaceIsReturned() {
    assertSame(subject, DominantFace.select(listOf(subject)))
  }

  @Test
  fun singleFaceIsReturnedEvenIfOffCenter() {
    assertSame(bystander, DominantFace.select(listOf(bystander)))
  }

  @Test
  fun clearDominantFaceBeatsSmallBackgroundFace() {
    assertSame(subject, DominantFace.select(listOf(bystander, subject)))
    assertSame(subject, DominantFace.select(listOf(subject, bystander)))
  }

  @Test
  fun ratioAboveThresholdIsAccepted() {
    // Area 0.07, so the subject is about 1.71x larger.
    val other = face(0.7f, 0.3f, 0.2f, 0.35f)
    assertSame(subject, DominantFace.select(listOf(subject, other)))
  }

  @Test
  fun nearTieJustBelowThresholdIsRejected() {
    // Area 0.081, so the ratio is about 1.48, just below 1.5.
    val other = face(0.7f, 0.3f, 0.3f, 0.27f)
    assertNull(DominantFace.select(listOf(subject, other)))
  }

  @Test
  fun similarSizedFacesAreRejected() {
    val other = face(0.7f, 0.3f, 0.28f, 0.4f)
    assertNull(DominantFace.select(listOf(subject, other)))
  }

  @Test
  fun largeFaceOutsideCenterRegionIsRejected() {
    // Largest face (area 0.12) but centered at (0.15, 0.2), far from the middle.
    val corner = face(0.0f, 0.0f, 0.3f, 0.4f)
    assertNull(DominantFace.select(listOf(corner, bystander)))
  }
}
